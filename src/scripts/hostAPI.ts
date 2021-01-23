var Swal: any;
var firebase: any;

namespace Host {
  var database = firebase.database();
  var analytics = firebase.analytics();
  export var roomId = window.localStorage.getItem("writeboardTempId");

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
    var ref = database.ref(`rooms/${roomId}/users`);
    var titleRef = database.ref(`rooms/${roomId}/name`);
    titleRef.once("value", updateTitle);

    ref.on("child_added", addWhiteboard);
    ref.on("child_changed", updateWhiteboard);
    ref.on("child_removed", removeWhiteboard);

    window.localStorage.removeItem("writeboardTempId");
  }

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
}