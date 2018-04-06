# Restaurant Reviews

Student Project - Restaurant Reviews_

---

## Overview

 The webiste retrieves data about restaurants from a server. The restaurants' data contain rating information about restaurants. The data main structure and images of the website is persisted in `cache` using a `service worker` and the restaurant information/list is stored in `indexedDB` to achieve a good Offline first experience. Furthermore, the design is responsive, to adjust properly in most/all screen displays. And finally, optimizations have been done based on results from `lighthouse` to ensure high score of accessibility.

### How to start

1. In `/dist` folder, start up a simple HTTP server to serve up the site files on your local computer. Python has some simple tools to do this, and you don't even need to know Python. For most people, it's already installed on your computer. In a terminal, check the version of Python you have: `python -V`. If you have Python 2.x, spin up the server with `python -m SimpleHTTPServer 8000` (or some other port, if port 8000 is already in use.) For Python 3.x, you can use `python3 -m http.server 8000`. If you don't have Python installed, navigate to Python's [website](https://www.python.org/) to download and install the software.

1. Follow the instructions to set up the restaurants' list server locally from [this repo](https://github.com/udacity/mws-restaurant-stage-2)

1. With your server running, visit the site: `http://localhost:8000`, and look around for a bit to see what the current experience looks like.

## START development the project

### Set up your google maps api key

```shell
export MAPS_API_KEY="your key"
```

### Install dependencies

```shell
npm i gulp -g
brew install imagemagick
```

### Start development mode (listen for changes and serve the project)

```shell
npm i
npm start
```

or

```shell
npm i
gulp
```

point your browser to : <http://localhost:8000/>

## Build and listen for the production version

```shell
npm i
gulp --production
```

point your browser to : <http://localhost:8000/>