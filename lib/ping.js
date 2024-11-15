const axios = require('axios')
const logger = require('./logger')
const MessageOf = require('./message')
const { TimeTracker } = require('./time')

const { getPlayerCountOrNull } = require('./util')

const config = require('../config')

const headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
}

function ping(serverRegistration, timeout, callback, version) {
  switch (serverRegistration.data.type) {
    case 'PC':
      const slug = serverRegistration.data.ip;
      const api = config.api;
      axios.get(`${api.info}/${slug}`, {
        headers: headers
    }).then(async (res) => {
        const body = res.data;
        const data = body.Data;
        // const maxPlayers = data.sv_maxclients;
        const players = data.players.length;
        const build = data.vars.sv_enforceGameBuild;
        const payload = {
          players: {
            online: capPlayerCount(serverRegistration.data.ip, parseInt(players))
          },
          version: parseInt(build)
        }

        const iconVersion = data.iconVersion;
        payload.favicon = `${api.icon}/${slug}/${iconVersion}.png`

        // Ensure the returned favicon is a data URI
        // if (res.favicon && res.favicon.startsWith('data:image/')) {
        //   payload.favicon = res.favicon
        // }
        callback(null, payload)
      }).catch((err) => {
        console.log(err);
        callback(err)
      })
      break
    default:
      throw new Error('Unsupported type: ' + serverRegistration.data.type)
  }
}

// player count can be up to 1^32-1, which is a massive scale and destroys browser performance when rendering graphs
// Artificially cap and warn to prevent propogating garbage
function capPlayerCount(host, playerCount) {
  const maxPlayerCount = 250000

  if (playerCount !== Math.min(playerCount, maxPlayerCount)) {
    logger.log('warn', '%s returned a player count of %d, Minetrack has capped it to %d to prevent browser performance issues with graph rendering. If this is in error, please edit maxPlayerCount in ping.js!', host, playerCount, maxPlayerCount)

    return maxPlayerCount
  } else if (playerCount !== Math.max(playerCount, 0)) {
    logger.log('warn', '%s returned an invalid player count of %d, setting to 0.', host, playerCount)

    return 0
  }
  return playerCount
}

class PingController {
  constructor(app) {
    this._app = app
    this._isRunningTasks = false
  }

  schedule() {
    setInterval(this.pingAll, config.rates.pingAll)

    this.pingAll()
  }

  pingAll = () => {
    const { timestamp, updateHistoryGraph } = this._app.timeTracker.newPointTimestamp()

    this.startPingTasks(results => {
      const updates = []

      for (const serverRegistration of this._app.serverRegistrations) {
        const result = results[serverRegistration.serverId]

        // Log to database if enabled
        // Use null to represent a failed ping
        if (config.logToDatabase) {
          const unsafePlayerCount = getPlayerCountOrNull(result.resp)

          this._app.database.insertPing(serverRegistration.data.ip, timestamp, unsafePlayerCount)
        }

        // Generate a combined update payload
        // This includes any modified fields and flags used by the frontend
        // This will not be cached and can contain live metadata
        const update = serverRegistration.handlePing(timestamp, result.resp, result.err, result.version, updateHistoryGraph)
        if (result.resp && result.resp.favicon) {
          update.favicon = result.resp.favicon
        }
        updates[serverRegistration.serverId] = update
      }

      // Send object since updates uses serverIds as keys
      // Send a single timestamp entry since it is shared
      this._app.server.broadcast(MessageOf('updateServers', {
        timestamp: TimeTracker.toSeconds(timestamp),
        updateHistoryGraph,
        updates
      }))
    })
  }

  startPingTasks = (callback) => {
    if (this._isRunningTasks) {
      logger.log('warn', 'Started re-pinging servers before the last loop has finished! You may need to increase "rates.pingAll" in config.json')

      return
    }

    this._isRunningTasks = true

    const results = []

    for (const serverRegistration of this._app.serverRegistrations) {
      const version = serverRegistration.getNextProtocolVersion()

      ping(serverRegistration, config.rates.connectTimeout, (err, resp) => {
        if (err && config.logFailedPings !== false) {
          logger.log('error', 'Failed to ping %s: %s', serverRegistration.data.ip, err.message)
        }

        results[serverRegistration.serverId] = {
          resp,
          err,
          version
        }

        if (Object.keys(results).length === this._app.serverRegistrations.length) {
          // Loop has completed, release the locking flag
          this._isRunningTasks = false

          callback(results)
        }
      }, version.protocolId)
    }
  }
}

module.exports = PingController
