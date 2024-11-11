<p align="center">
	<img width="80" height="80" src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.6/assets/png/1f40c.png">
</p>

# Fivetrack 

Fivetrack is fork of Minetrack, popular tracker of favourite Minecraft servers. This fork changed tracking Minecraft servers to FiveM servers by their unique server slug ID.

### Features
- 🚀 Real time server player count tracking with customizable update speed.
- 📝 Historical player count logging with 24 hour peak and player count record tracking.
- 📈 Historical graph with customizable time frame.
- 📦 Out of the box included dashboard with various customizable sorting and viewing options.

## Installation
1. Node 12.4.0+ is required (you can check your version using `node -v`)
2. Make sure everything is correct in ```config.json```.
3. Add/remove servers by editing the ```servers.json``` file
4. Run ```npm install```
5. Run ```npm run build``` (this bundles `assets/` into `dist/`)
6. Run ```node main.js``` to boot the system (may need sudo!)

(There's also ```install.sh``` and ```start.sh```, but they may not work for your OS.)

Database logging is disabled by default. You can enable it in ```config.json``` by setting ```logToDatabase``` to true.
This requires sqlite3 drivers to be installed.

## Docker
Minetrack can be built and run with Docker from this repository in several ways:

### Build and deploy with docker-compose
```
# build and start service
docker-compose up --build

# stop service and remove artifacts
docker-compose down
```
