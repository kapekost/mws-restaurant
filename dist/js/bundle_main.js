(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

},{}],2:[function(require,module,exports){
const ImageInfo = require('./images');
const idb = require('idb');
/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = '1337'; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static initIndexedDB() {
    this.dbPromise = idb.open('restaurant-db', 1, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
        case 1:
          const restaurantStore = upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
          restaurantStore.createIndex('photographs', 'photograph');
      }
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    var self = this;

    DBHelper.fetchRestaurantsFromStorage().then(restaurants => {
      callback(null, restaurants);
    });

    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL);
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Got a success response from server!
        const restaurants = JSON.parse(xhr.responseText);
        const imageData = ImageInfo.ImageInfoData;
        restaurants.map(function (restaurant) {
          if (restaurant.photograph) {
            restaurant.alt = imageData[restaurant.photograph].alt;
            restaurant.caption = imageData[restaurant.photograph].caption;
          }
          self.dbPromise.then(function (db) {
            var tx = db.transaction('restaurants', 'readwrite');
            var restaurantStore = tx.objectStore('restaurants');
            return restaurantStore.put(restaurant);
          });
          return restaurant;
        });
        callback(null, restaurants);
      } else {
        // Oops!. Got an error from server.
        this.dbPromise.then(() => {
          return DBHelper.fetchRestaurantsFromStorage();
        }).then(function (restaurants) {
          callback(null, restaurants);
        }).catch(function () {
          const error = `Request failed.`;
          callback(error, null);
        });
      }
    };
    xhr.onerror = function () {
      DBHelper.fetchRestaurantsFromStorage().then(restaurants => {
        callback(null, restaurants);
      });
    };
    xhr.send();
  }

  /**
   * Fetch restaurants from indecedDB
   */
  static fetchRestaurantsFromStorage() {
    return this.dbPromise.then(function (db) {
      var tx = db.transaction('restaurants');
      var restaurantsStore = tx.objectStore('restaurants');
      return restaurantsStore.getAll();
    });
  }

  /**
   * Fetch restaurant by Id from indecedDB
   */
  static fetchRestaurantFromStorage(id) {
    return this.dbPromise.then(function (db) {
      var tx = db.transaction('restaurants');
      var restaurantsStore = tx.objectStore('restaurants');
      return restaurantsStore.get(parseInt(id));
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    var self = this;

    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL + '/' + id);
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Got a success response from server!
        const restaurant = JSON.parse(xhr.responseText);
        if (restaurant.photograph) {
          const imageData = ImageInfo.ImageInfoData;
          restaurant.alt = imageData[restaurant.photograph].alt;
          restaurant.caption = imageData[restaurant.photograph].caption;
        }
        self.dbPromise.then(function (db) {
          var tx = db.transaction('restaurants', 'readwrite');
          var restaurantStore = tx.objectStore('restaurants');
          return restaurantStore.put(restaurant);
        });
        callback(null, restaurant);
      } else {
        // Oops!. Got an error from server.
        this.dbPromise.then(() => {
          return DBHelper.fetchRestaurantFromStorage(id);
        }).then(function (restaurant) {
          callback(null, restaurant);
        }).catch(function () {
          const error = `Request failed.`;
          callback(error, null);
        });
      }
    };
    xhr.onerror = function () {
      DBHelper.fetchRestaurantFromStorage(id).then(function (restaurant) {
        callback(null, restaurant);
      });
    };
    xhr.send();
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URLs JSON.
   */
  static imageUrlForRestaurant(restaurant) {
    const representationsURLs = DBHelper.imageRepresentationsPaths(restaurant.photograph);
    return representationsURLs;
  }

  /**
   * Paths for various image representations
   */
  static imageRepresentationsPaths(filename) {
    const [folderName, suffix] = ['./img/', 'jpg']; //,'webp'];
    const large_1x = folderName.concat(filename, '-512_1x', '.', suffix);
    const large_2x = folderName.concat(filename, '-512_2x', '.', suffix);
    const small_1x = folderName.concat(filename, '-380_1x', '.', suffix);
    const small_2x = folderName.concat(filename, '-380_2x', '.', suffix);

    return {
      large_1x: large_1x,
      large_2x: large_2x,
      small_1x: small_1x,
      small_2x: small_2x
    };
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

}
module.exports = DBHelper;

},{"./images":3,"idb":1}],3:[function(require,module,exports){
/**
 * Common image info class
 */
class ImageInfo {

  static get ImageInfoData() {

    return {
      1: {
        "id": 1,
        "photograph": "1",
        "alt": "the main restaurant area",
        "caption": "Large space with nice decoration"
      },
      2: {
        "id": 2,
        "photograph": "2",
        "alt": "pizza on a plate",
        "caption": "Tasty pizzas made every day"
      },
      3: {
        "id": 3,
        "photograph": "3",
        "alt": "the main restaurant area empty",
        "caption": "Modern design to enjoy your meals"
      },
      4: {
        "id": 4,
        "photograph": "4",
        "alt": "the entrance of the shop",
        "caption": "The corner shop, easy to spot"
      },
      5: {
        "id": 5,
        "photograph": "5",
        "alt": "inside the shop, customers and staff",
        "caption": "Meet our friendly staff"
      },
      6: {
        "id": 6,
        "photograph": "6",
        "alt": "the area inside with some people queueing and other eating",
        "caption": "Large space for big groups"
      },
      7: {
        "id": 7,
        "photograph": "7",
        "alt": "black and white, the display of the shop with 2 people passing by",
        "caption": "Our classic shop, still keeping our values"
      },
      8: {
        "id": 8,
        "photograph": "8",
        "alt": "outdoor display of the corner shop, big label reads 'the Dutch'",
        "caption": "Easy to find our beautiful building"
      },
      9: {
        "id": 9,
        "photograph": "9",
        "caption": "Enjoying our home made meals",
        "alt": "black and white, people eating in the restaurant"
      },
      10: {
        "id": 10,
        "photograph": "10",
        "alt": "the area inside the shop, the furniture and bar, without people",
        "caption": "Modern space, ready to serve your appetite"
      }
    };
  }
}

module.exports = ImageInfo;

},{}],4:[function(require,module,exports){
var _this = this;

const DBHelper = require('./dbhelper');

let restaurants, neighborhoods, cuisines;
var map;
this.markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Service Worker (self init)
 */
(setupServiceWorker = () => {
  return new Promise((resolve, reject) => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        return navigator.serviceWorker.register('/sw.js');
      });
    }
  });
})();
/**
 * Initialise indexedDB
 */
DBHelper.initIndexedDB();

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      //  Got an error
      console.error(error);
    } else {
      _this.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = _this.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      _this.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = _this.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  _this.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
  // Remove all restaurants
  _this.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  _this.markers.forEach(m => m.setMap(null));
  _this.markers = [];
  _this.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = _this.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
  const li = document.createElement('li');

  if (restaurant.photograph) {
    const imageRepresentations = DBHelper.imageUrlForRestaurant(restaurant);
    const picture = document.createElement('picture');
    picture.className = 'restaurant-img';
    picture.setAttribute('aria-labelledby', "fig_" + restaurant.id);
    picture.setAttribute('role', 'img');

    const sourceSmall = document.createElement('source');
    sourceSmall.setAttribute('media', '(max-width:700px)');
    sourceSmall.setAttribute('srcset', imageRepresentations.small_1x.concat(' 1x,').concat(imageRepresentations.small_2x).concat(' 2x'));
    picture.append(sourceSmall);

    const sourceLarge = document.createElement('source');
    sourceLarge.setAttribute('media', '(min-width:701px)');
    sourceLarge.setAttribute('srcset', imageRepresentations.large_1x.concat(' 1x,').concat(imageRepresentations.large_2x).concat(' 2x'));
    picture.append(sourceLarge);

    const image = document.createElement('img');
    image.src = imageRepresentations.small_2x;
    image.setAttribute('alt', 'restaurant '.concat(restaurant.name, ', ', restaurant.alt));
    image.className = 'restaurant-img';
    picture.append(image);

    const figcaption = document.createElement('figcaption');
    figcaption.setAttribute('id', "fig_" + restaurant.id);
    figcaption.innerHTML = restaurant.caption;
    picture.append(figcaption);

    li.append(picture);
  }

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('role', 'button');
  more.setAttribute('aria-label', 'View more about ' + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = _this.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, _this.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    _this.markers.push(marker);
  });
};

},{"./dbhelper":2}]},{},[4])

//# sourceMappingURL=bundle_main.js.map
