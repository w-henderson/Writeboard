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
        document.querySelector("input").onkeyup = Chat.sendMessage;
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
        var messageIndicator = document.createElement("div");
        userWhiteboard.src = e.val().board;
        userWhiteboard.onclick = Chat.clickHandler;
        userName.textContent = e.val().name;
        userNode.id = e.key;
        messageIndicator.style.display = "none";
        userNode.appendChild(userWhiteboard);
        userNode.appendChild(userName);
        userNode.appendChild(messageIndicator);
        whiteboards.appendChild(userNode);
        Chat.seenMessages[e.key] = 0;
        console.log("Added whiteboard");
    }
    function updateWhiteboard(e) {
        var data = e.val();
        var userNode = document.querySelector("div.whiteboards div#" + e.key);
        userNode.querySelector("img").src = data.board;
        userNode.querySelector("span").firstChild.textContent = data.name;
        if (e.key === Host.maximisedUser) {
            var div = document.querySelector("div.maximised");
            if (data === null)
                Chat.hideMaximised(true);
            else
                div.querySelector("img").src = data.board;
            if (data.messages) {
                var messagesDiv = document.querySelector("div.messages");
                messagesDiv.innerHTML = "";
                for (var messageId in data.messages) {
                    var outerSpan = document.createElement("span");
                    var innerSpan = document.createElement("span");
                    outerSpan.className = data.messages[messageId].sender + "Message";
                    innerSpan.textContent = data.messages[messageId].content;
                    outerSpan.appendChild(innerSpan);
                    messagesDiv.appendChild(outerSpan);
                }
                messagesDiv.lastChild.scrollIntoView();
                Chat.seenMessages = Object.keys(data.messages).length;
            }
        }
        if (data.messages && Object.keys(data.messages).length > Chat.seenMessages[e.key]) {
            userNode.querySelector("div").style.display = "block";
            userNode.querySelector("div").textContent = (Object.keys(data.messages).length - Chat.seenMessages[e.key]).toString();
        }
        else {
            userNode.querySelector("div").style.display = "none";
        }
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
        Chat.seenMessages = {};
        function showMaximisedBoard(id) {
            var div = document.querySelector("div.maximised");
            div.querySelector("img").src = document.querySelector("div#" + id + " img").src;
            div.querySelector("span").textContent = document.querySelector("div#" + id + " span").firstChild.textContent;
            div.onclick = closeClickHandler;
            div.className = "maximised shown";
            Host.maximisedUser = id;
            maximisedRef = database.ref("rooms/" + Host.roomId + "/users/" + Host.maximisedUser);
            maximisedRef.update({
                maximised: true
            });
        }
        Chat.showMaximisedBoard = showMaximisedBoard;
        function hideMaximised(deleted) {
            if (deleted === void 0) { deleted = false; }
            var div = document.querySelector("div.maximised");
            div.className = "maximised";
            div.onclick = null;
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
        function sendMessage(e) {
            e.preventDefault();
            if (e.keyCode !== 13)
                return;
            var input = document.querySelector("input");
            var messageText = input.value;
            input.value = "";
            var messagesRef = database.ref("rooms/" + Host.roomId + "/users/" + Host.maximisedUser + "/messages").push();
            messagesRef.set({
                sender: "host",
                content: messageText
            });
        }
        Chat.sendMessage = sendMessage;
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
