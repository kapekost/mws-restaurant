const DBHelper = require('./dbhelper');
const ReviewsHandler = require('./reviews_handler');
const moment = require('moment');

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


  const username_element = document.createElement('input');
  username_element.setAttribute('type', 'text');
  username_element.setAttribute('id', 'name');
  username_element.setAttribute('name', 'name');
  username_element.setAttribute('placeholder', 'name');
  container.appendChild(username_element);

  const rating_start_elem = document.createElement('p');
  rating_start_elem.innerHTML = getStarRatingTemplate();

  container.appendChild(rating_start_elem);

  const comments_area = document.createElement('textarea');
  comments_area.setAttribute('id', 'comments');
  comments_area.setAttribute('name', 'comments');
  container.appendChild(comments_area);

  const restaurant_id_element = document.createElement('input');
  restaurant_id_element.setAttribute('type', 'hidden');
  restaurant_id_element.setAttribute('name', 'id');
  restaurant_id_element.setAttribute('value', this.restaurant.id);
  container.appendChild(restaurant_id_element);

  const submit_btn = document.createElement('button');
  submit_btn.setAttribute('id', 'submit');
  submit_btn.innerText = 'submit';
  submit_btn.addEventListener("click", () => {

    const getRating = function () {
      const rating_radios = document.getElementsByName('rating_radio');
      for (radio of rating_radios) {
        if (radio.checked) {
          {
            return radio.value;
          }
        }
      }
      return 0;
    }
    const review = {
      name: username_element.value,
      rating: getRating(),
      comments: comments_area.value,
      restaurant_id: restaurant_id_element.value
    };
    if (review.name && review.rating && review.comments && review.restaurant_id) {
      ReviewsHandler.addReview(review).then(() => {
        const ul = document.getElementById('reviews-list');
        review.date = moment();
        ul.appendChild(createReviewHTML(review));
      });
    }
  });

  container.appendChild(submit_btn);

}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('h3');
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

/**
 * Get the HTML template of star rating.
 */
getStarRatingTemplate = () => {
  return `<fieldset class="rating" id="rating_value">
  <input type="radio" id="star5" name="rating_radio" value="5" /><label class = "full" for="star5" title="Awesome - 5 stars"></label>
  <input type="radio" id="star4half" name="rating_radio" value="4.5" /><label class="half" for="star4half" title="Pretty good - 4.5 stars"></label>
  <input type="radio" id="star4" name="rating_radio" value="4" /><label class = "full" for="star4" title="Pretty good - 4 stars"></label>
  <input type="radio" id="star3half" name="rating_radio" value="3.5" /><label class="half" for="star3half" title="Meh - 3.5 stars"></label>
  <input type="radio" id="star3" name="rating_radio" value="3" /><label class = "full" for="star3" title="Meh - 3 stars"></label>
  <input type="radio" id="star2half" name="rating_radio" value="2.5" /><label class="half" for="star2half" title="Kinda bad - 2.5 stars"></label>
  <input type="radio" id="star2" name="rating_radio" value="2" /><label class = "full" for="star2" title="Kinda bad - 2 stars"></label>
  <input type="radio" id="star1half" name="rating_radio" value="1.5" /><label class="half" for="star1half" title="Meh - 1.5 stars"></label>
  <input type="radio" id="star1" name="rating_radio" value="1" /><label class = "full" for="star1" title="Sucks big time - 1 star"></label>
  <input type="radio" id="starhalf" name="rating_radio" value="0.5" /><label class="half" for="starhalf" title="Sucks big time - 0.5 stars"></label>
</fieldset>`
}