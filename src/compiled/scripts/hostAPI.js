var Swal;
var firebase;
var Host;
(function (Host) {
    var database = firebase.database();
    var analytics = firebase.analytics();
    Host.roomId = window.localStorage.getItem("writeboardTempId");
    var ref;
    var titleRef;
    var maximisedRef;
    window.addEventListener("load", function () {
        if (!Host.roomId) {
            Swal.fire({
                title: "Error 404",
                text: "Writeboard Not Found",
                icon: "error",
                background: "var(--background)"
            }).then(function () {
                analytics.logEvent("failHost", {});
                window.location.href = "/";
            });
        }
        else {
            ref = database.ref("rooms/" + Host.roomId + "/users");
            titleRef = database.ref("rooms/" + Host.roomId + "/name");
            titleRef.once("value", updateTitle);
            ref.on("child_added", addWhiteboard);
            ref.on("child_changed", updateWhiteboard);
            ref.on("child_removed", removeWhiteboard);
            window.localStorage.removeItem("writeboardTempId");
        }
    });
    function updateTitle(e) {
        var data = e.val();
        document.title = data + " - Writeboard";
        document.querySelector("h1").textContent = data + " (" + Host.roomId + ")";
        analytics.logEvent("host", { roomId: Host.roomId, title: data });
    }
    function addWhiteboard(e) {
        var whiteboards = document.querySelector("div.whiteboards");
        if (whiteboards.textContent.trim() === "Waiting for people to connect...")
            whiteboards.innerHTML = "";
        var userNode = document.createElement("div");
        var userWhiteboard = document.createElement("img");
        var userName = document.createElement("span");
        var messageIcon = document.createElement("i");
        userWhiteboard.src = e.val().board;
        userWhiteboard.onclick = Chat.clickHandler;
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIcon.className = "material-icons-round";
        messageIcon.textContent = "message";
        messageIcon.onclick = function (e) {
            var userId = e.target.parentNode.parentNode.id;
            var userName = e.target.parentNode.firstChild.textContent;
            var messageRef = database.ref("rooms/" + Host.roomId + "/users/" + userId + "/message");
            Swal.fire({
                title: "Message to " + userName + ":",
                text: "This will pop up on " + userName + "'s screen.",
                icon: "info",
                input: 'text',
                confirmButtonText: 'Send Message',
                background: "var(--background)",
                allowOutsideClick: true,
                preConfirm: function (msg) {
                    if (msg.length === 0) {
                        Swal.showValidationMessage("You can't send an empty message!");
                        return false;
                    }
                    else {
                        return msg;
                    }
                }
            }).then(function (result) {
                if (result.isConfirmed) {
                    messageRef.set(result.value);
                    Swal.fire({
                        title: "Message sent!",
                        text: "Your message has been successfully sent.",
                        icon: "success",
                        background: "var(--background)"
                    });
                }
            });
        };
        userName.appendChild(messageIcon);
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        whiteboards.appendChild(userNode);
        console.log("Added whiteboard");
    }
    function updateWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = e.val().board;
        userNode.querySelector("span").firstChild.textContent = e.val().name;
        console.log("Updated whiteboard");
    }
    function removeWhiteboard(e) {
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.remove();
        if (document.querySelector("div.whiteboards").innerHTML === "")
            document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";
        console.log("Removed whiteboard");
    }
    window.addEventListener("beforeunload", function () {
        analytics.logEvent("closeRoom", { roomId: Host.roomId });
        return database.ref("rooms/" + Host.roomId).remove().then(function () { return; });
    });
    var Chat;
    (function (Chat) {
        function showMaximisedBoard(id) {
            var div = document.querySelector("div.maximised");
            div.querySelector("img").src = document.querySelector("div#" + id + " img").src;
            div.querySelector("span").textContent = document.querySelector("div#" + id + " span").firstChild.textContent;
            div.onclick = closeClickHandler;
            div.className = "maximised shown";
            Host.maximisedUser = id;
            // Disconnect from all the other boards to save data
            ref.off("child_added");
            ref.off("child_changed");
            ref.off("child_removed");
            // Remove all the other boards to prevent duplication bug
            document.querySelector("div.whiteboards").innerHTML = "";
            maximisedRef = database.ref("rooms/" + Host.roomId + "/users/" + Host.maximisedUser);
            maximisedRef.update({
                maximised: true
            });
            maximisedRef.on("value", function (data) {
                var userData = data.val();
                if (userData === null)
                    hideMaximised(true);
                else
                    div.querySelector("img").src = data.val().board;
            });
        }
        Chat.showMaximisedBoard = showMaximisedBoard;
        function hideMaximised(deleted) {
            if (deleted === void 0) { deleted = false; }
            var div = document.querySelector("div.maximised");
            div.className = "maximised";
            div.onclick = null;
            // Turn standard event handling back on
            ref.on("child_added", addWhiteboard);
            ref.on("child_changed", updateWhiteboard);
            ref.on("child_removed", removeWhiteboard);
            if (!deleted) {
                maximisedRef.update({
                    maximised: false
                });
            }
            else {
                Swal.fire({
                    title: "User left the room.",
                    text: "The user you were viewing has just left the room, so the connection to their board has been lost.",
                    icon: "warning",
                    background: "var(--background)"
                });
            }
            maximisedRef.off();
            maximisedRef = undefined;
            Host.maximisedUser = undefined;
        }
        Chat.hideMaximised = hideMaximised;
        function clickHandler(e) {
            showMaximisedBoard(e.target.parentNode.id);
        }
        Chat.clickHandler = clickHandler;
        function closeClickHandler(e) {
            if (e.target.className === "maximised shown")
                hideMaximised();
        }
        Chat.closeClickHandler = closeClickHandler;
    })(Chat = Host.Chat || (Host.Chat = {}));
})(Host || (Host = {}));
