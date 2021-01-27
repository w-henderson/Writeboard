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
    let messageIcon = document.createElement("i");

    userWhiteboard.src = e.val().board;
    userWhiteboard.onclick = Chat.clickHandler;
    userName.textContent = e.val().name;
    userNode.id = e.key;

    messageIcon.className = "material-icons-round";
    messageIcon.textContent = "message";
    messageIcon.onclick = (e) => {
      let userId = (<HTMLElement>(<HTMLElement>e.target).parentNode.parentNode).id;
      let userName = (<HTMLElement>e.target).parentNode.firstChild.textContent;
      let messageRef = database.ref(`rooms/${roomId}/users/${userId}/message`);

      Swal.fire({
        title: `Message to ${userName}:`,
        text: `This will pop up on ${userName}'s screen.`,
        icon: "info",
        input: 'text',
        confirmButtonText: 'Send Message',
        background: "var(--background)",
        allowOutsideClick: true,
        preConfirm: (msg: string) => {
          if (msg.length === 0) {
            Swal.showValidationMessage("You can't send an empty message!");
            return false;
          } else {
            return msg;
          }
        },
      }).then((result) => {
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
    }

    userName.appendChild(messageIcon);
    userNode.appendChild(userWhiteboard);
    userNode.appendChild(userName);
    whiteboards.appendChild(userNode);

    console.log("Added whiteboard");
  }

  function updateWhiteboard(e) {
    let userNode = document.querySelector(`div.whiteboards div#${e.key}`);
    userNode.querySelector("img").src = e.val().board;
    userNode.querySelector("span").firstChild.textContent = e.val().name;

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
    export function showMaximisedBoard(id: string) {
      let div: HTMLElement = document.querySelector("div.maximised");

      div.querySelector("img").src = (<HTMLImageElement>document.querySelector(`div#${id} img`)).src;
      div.querySelector("span").textContent = document.querySelector(`div#${id} span`).firstChild.textContent;
      div.onclick = closeClickHandler;

      div.className = "maximised shown";
      maximisedUser = id;

      // Disconnect from all the other boards to save data
      ref.off("child_added");
      ref.off("child_changed");
      ref.off("child_removed");

      // Remove all the other boards to prevent duplication bug
      document.querySelector("div.whiteboards").innerHTML = "";

      maximisedRef = database.ref(`rooms/${roomId}/users/${maximisedUser}`);
      maximisedRef.update({
        maximised: true
      });
      maximisedRef.on("value", (data) => {
        let userData = data.val();
        if (userData === null) hideMaximised(true);
        else div.querySelector("img").src = data.val().board;
      });
    }

    export function hideMaximised(deleted = false) {
      let div: HTMLElement = document.querySelector("div.maximised");
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

    export function clickHandler(e) {
      showMaximisedBoard(e.target.parentNode.id);
    }

    export function closeClickHandler(e) {
      if (e.target.className === "maximised shown") hideMaximised();
    }
  }
}