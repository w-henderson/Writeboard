var Swal: any;
var firebase: any;

namespace Host {
  var database = firebase.database();
  var analytics = firebase.analytics();
  export var roomId = window.localStorage.getItem("writeboardTempId");
  export var maximisedUser;

  var ref;
  var titleRef;
  var maximisedRef;

  window.addEventListener("load", () => {
    if (!roomId) {
      Swal.fire({
        title: "Error 404",
        text: "Writeboard Not Found",
        icon: "error",
        background: "var(--background)"
      }).then(() => {
        analytics.logEvent("failHost", {});
        window.location.href = "/";
      });
    } else {
      ref = database.ref(`rooms/${roomId}/users`);
      titleRef = database.ref(`rooms/${roomId}/name`);
      titleRef.once("value", updateTitle);

      ref.on("child_added", addWhiteboard);
      ref.on("child_changed", updateWhiteboard);
      ref.on("child_removed", removeWhiteboard);

      window.localStorage.removeItem("writeboardTempId");
    }

    document.querySelector("input").onkeyup = Chat.sendMessage;
  });

  function updateTitle(e) {
    let data = e.val();
    document.title = `${data} - Writeboard`;
    document.querySelector("h1").textContent = `${data} (${roomId})`;

    analytics.logEvent("host", { roomId, title: data });
  }

  function addWhiteboard(e) {
    let whiteboards = document.querySelector("div.whiteboards");
    if (whiteboards.textContent.trim() === "Waiting for people to connect...") whiteboards.innerHTML = "";

    let userNode = document.createElement("div");
    let userWhiteboard = document.createElement("img");
    let userName = document.createElement("span");
    let messageIndicator = document.createElement("div");

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
    let data = e.val();
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.querySelector("img").src = data.board;
    userNode.querySelector("span").firstChild.textContent = data.name;

    if (e.key === maximisedUser) {
      let div: HTMLElement = document.querySelector("div.maximised");
      if (data === null) Chat.hideMaximised(true);
      else div.querySelector("img").src = data.board;

      if (data.messages) {
        let messagesDiv = document.querySelector("div.messages");
        messagesDiv.innerHTML = "";

        for (let messageId in data.messages) {
          let outerSpan = document.createElement("span");
          let innerSpan = document.createElement("span");
          outerSpan.className = data.messages[messageId].sender + "Message";
          innerSpan.textContent = data.messages[messageId].content;
          outerSpan.appendChild(innerSpan);
          messagesDiv.appendChild(outerSpan);
        }

        (<HTMLSpanElement>messagesDiv.lastChild).scrollIntoView();
        Chat.seenMessages = Object.keys(data.messages).length;
      }
    }

    if (data.messages && Object.keys(data.messages).length > Chat.seenMessages[e.key]) {
      userNode.querySelector("div").style.display = "block";
      userNode.querySelector("div").textContent = (Object.keys(data.messages).length - Chat.seenMessages[e.key]).toString();
    } else {
      userNode.querySelector("div").style.display = "none";
    }

    console.log("Updated whiteboard");
  }

  function removeWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.remove();

    if (document.querySelector("div.whiteboards").innerHTML === "") document.querySelector("div.whiteboards").textContent = "Waiting for people to connect...";

    console.log("Removed whiteboard");
  }

  window.addEventListener("beforeunload", () => {
    analytics.logEvent("closeRoom", { roomId });
    return database.ref(`rooms/${roomId}`).remove().then(() => { return });
  });

  export namespace Chat {
    export var seenMessages: any = {};

    export function showMaximisedBoard(id: string) {
      let div: HTMLElement = document.querySelector("div.maximised");

      div.querySelector("img").src = (<HTMLImageElement>document.querySelector(`div#${id} img`)).src;
      div.querySelector("span").textContent = document.querySelector(`div#${id} span`).firstChild.textContent;
      div.onclick = closeClickHandler;

      div.className = "maximised shown";
      maximisedUser = id;

      maximisedRef = database.ref(`rooms/${roomId}/users/${maximisedUser}`);
      maximisedRef.update({
        maximised: true
      });
    }

    export function hideMaximised(deleted = false) {
      let div: HTMLElement = document.querySelector("div.maximised");
      div.className = "maximised";
      div.onclick = null;

      if (!deleted) {
        maximisedRef.update({
          maximised: false
        });
      } else {
        Swal.fire({
          title: "User left the room.",
          text: "The user you were viewing has just left the room, so the connection to their board has been lost.",
          icon: "warning",
          background: "var(--background)"
        });
      }

      maximisedRef.off();
      maximisedRef = undefined;
      maximisedUser = undefined;
    }

    export function sendMessage(e) {
      e.preventDefault();
      if (e.keyCode !== 13) return;

      let input = document.querySelector("input");
      let messageText = input.value;
      input.value = "";

      let messagesRef = database.ref(`rooms/${roomId}/users/${maximisedUser}/messages`).push();
      messagesRef.set({
        sender: "host",
        content: messageText
      });
    }

    export function clickHandler(e) {
      showMaximisedBoard(e.target.parentNode.id);
    }

    export function closeClickHandler(e) {
      if (e.target.className === "maximised shown") hideMaximised();
    }
  }
}