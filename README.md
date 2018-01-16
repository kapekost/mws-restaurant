# Restaurant Reviews
---
#### Student Project - Restaurant Reviews_

## Project Overview:

 Responsive design on different sized displays and accessible for screen reader use. Implemented service worker and indexedDB for offline experience.

### Specification

You have been provided the code for a restaurant reviews website. The code has a lot of issues. It’s barely usable on a desktop browser, much less a mobile device. It also doesn’t include any standard accessibility features, and it doesn’t work offline at all. Your job is to update the code to resolve these issues while still maintaining the included functionality.

### What do I do from here?

1. set your environment variable for google maps api key:

```shell
export MAPS_API_KEY="your key"
```

2. In `/dist` folder, start up a simple HTTP server to serve up the site files on your local computer. Python has some simple tools to do this, and you don't even need to know Python. For most people, it's already installed on your computer.

In a terminal, check the version of Python you have: `python -V`. If you have Python 2.x, spin up the server with `python -m SimpleHTTPServer 8000` (or some other port, if port 8000 is already in use.) For Python 3.x, you can use `python3 -m http.server 8000`. If you don't have Python installed, navigate to Python's [website](https://www.python.org/) to download and install the software.

3. Follow the instructions to set up the server locally from [this repo](https://github.com/udacity/mws-restaurant-stage-2)

4. With your server running, visit the site: `http://localhost:8000`, and look around for a bit to see what the current experience looks like.

## START development the project


```shell
npm i
npm start
```

or

```shell
npm i
gulp
```

## Build and listen for the production version

```shell
npm i
gulp --production
```

point your browser to : <http://localhost:8000>