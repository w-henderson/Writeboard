var firebase;
var Client;
(function (Client) {
    Client.database = firebase.database(); // REMOVE EXPORT IN PRODUCTION
})(Client || (Client = {}));
