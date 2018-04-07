const DBHelper = require('./dbhelper');

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      this.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(this.restaurant, this.map);
    }
  });
}

/**
 * Initialise indexedDB
 */
DBHelper.initIndexedDB();


/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (this.restaurant) { // restaurant already fetched!
    callback(null, this.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      this.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = this.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  if (restaurant.photograph) {
    const picture = document.getElementById('restaurant-img');
    picture.className = 'restaurant-img';
    picture.setAttribute('aria-labelledby', "fig_" + restaurant.id);
    picture.setAttribute('role', 'img');

    const imageRepresentations = DBHelper.imageUrlForRestaurant(restaurant);
    const sourceSmall = document.createElement('source');
    sourceSmall.setAttribute('media', '(max-width:700px)')
    sourceSmall.setAttribute('srcset',
      imageRepresentations.small_1x
        .concat(' 1x,')
        .concat(imageRepresentations.small_2x)
        .concat(' 2x')
    );
    picture.append(sourceSmall);

    const sourceLarge = document.createElement('source');
    sourceLarge.setAttribute('media', '(min-width:701px)')
    sourceLarge.setAttribute('srcset',
      imageRepresentations.large_1x
        .concat(' 1x,')
        .concat(imageRepresentations.large_2x)
        .concat(' 2x')
    );
    picture.append(sourceLarge);

    const image = document.createElement('img');
    image.src = imageRepresentations.small_2x;
    image.setAttribute('alt', 'restaurant '.concat(restaurant.name, ', ', restaurant.alt));
    image.className = 'restaurant-img';
    picture.append(image);

    const figcaption = document.createElement('figcaption');
    figcaption.setAttribute('id', "fig_" + restaurant.id)
    figcaption.innerHTML = restaurant.caption;
    picture.append(figcaption);
  }

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
  fillSubmitReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = this.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = this.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create submit reviews HTML and add them to the webpage.
 */
fillSubmitReviewsHTML = () => {
  const container = document.getElementById('reviews-submit-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Submit Review';
  container.appendChild(title);


  const username = document.createElement('input');
  username.setAttribute('type', 'text');
  username.setAttribute('id', 'username');
  username.setAttribute('name', 'username');
  username.setAttribute('placeholder', 'username');
  container.appendChild(username);

  const rating = document.createElement('input');
  rating.setAttribute('type', 'number');
  rating.setAttribute('min', 0);
  rating.setAttribute('max', 5);
  rating.setAttribute('id', 'rating');
  rating.setAttribute('name', 'rating');
  rating.setAttribute('placeholder', 'username');
  container.appendChild(rating);

  const comments_area = document.createElement('textarea');
  comments_area.setAttribute('id', 'comments');
  comments_area.setAttribute('name', 'comments');
  container.appendChild(comments_area);

  const submit_btn = document.createElement('button');
  submit_btn.setAttribute('id', 'submit');
  submit_btn.innerText = 'submit';
  container.appendChild(submit_btn);

  const restaurant_id = document.createElement('input');
  restaurant_id.setAttribute('type', 'hidden');
  restaurant_id.setAttribute('name', 'id');
  restaurant_id.setAttribute('value', this.restaurant);
  container.appendChild(restaurant_id);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = this.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a_link = document.createElement('a');
  a_link.setAttribute('href', '#');
  a_link.setAttribute('aria-current', 'page');
  a_link.setAttribute('class', 'current-page')
  a_link.innerHTML = restaurant.name;
  li.appendChild(a_link);
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}