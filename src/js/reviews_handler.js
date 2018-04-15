/**
 * Manage reviews class.
 */
const DBHelper = require('./dbhelper');
const moment = require('moment');

class ReviewsHandler {

    /**
     * Reviews Endpoint URL.
     * Change this to restaurants.json file location on your server.
     */
    static get REVIEWS_URL() {
        const port = '@@server_port' // Change this to your server port
        return `http://localhost:${port}/reviews`;
    }

    /**
     * Fetch all reviews.
     */
    static fetchReviews() {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', ReviewsHandler.REVIEWS_URL);
            xhr.onload = () => {
                if (xhr.status === 200) { // Got a success response from server!
                    const reviews = JSON.parse(xhr.responseText);
                    resolve(reviews);
                } else { // Oops!. Got an error from server.
                    const error = (`Request failed.`);
                    reject(error);
                }
            };
            xhr.onerror = (error) => {
                console.log(error);
                reject(error);
            }
            xhr.send();
        });
    }

    /**
     * Fetch reviews by restaurant id.
     */
    static fetchReviewsByRestaurantId(id) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', ReviewsHandler.REVIEWS_URL + '/?restaurant_id=' + id);
            xhr.onload = () => {
                if (xhr.status === 200) { // Got a success response from server!
                    const reviews = JSON.parse(xhr.responseText);
                    reviews.map((review) => {
                        review.date = moment(review.updatedAt).fromNow();
                    });
                    resolve(reviews);
                } else { // Oops!. Got an error from server.
                    const error = (`Request failed.`);
                    reject(error);
                }
            };
            xhr.onerror = (error) => {
                console.log(error);
                reject(error);
            }
            xhr.send();
        });
    }

    /**
     * Fetch reviews by restaurant id.
     */
    static addReview(review) {
        const params =
            `restaurant_id=${review.restaurant_id}
            &name=${review.name}
            &rating=${review.rating}
            &comments=${review.comments}`

        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open('POST', ReviewsHandler.REVIEWS_URL);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
            xhr.onload = () => {
                resolve();
                console.log("submitted succesfully:", params);
            };
            xhr.onerror = (error) => {
                console.log(error);
                reject(error);
            }
            xhr.send(params);
        });
    }
}
module.exports = ReviewsHandler;