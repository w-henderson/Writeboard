var Swal: any;
var firebase: any;

namespace UI {
  export var database = firebase.database(); // REMOVE EXPORT IN PRODUCTION

  export function joinRoom() {
    Swal.fire({
      title: 'Enter the room ID.',
      text: "Ask the room host if you don't know the room ID.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Join',
      background: "var(--background)",
      showLoaderOnConfirm: true,
      allowOutsideClick: true,
      preConfirm: (id: string) => {
        let regex = new RegExp("^[a-zA-Z]{6}$")
        if (!regex.test(id)) {
          Swal.showValidationMessage("Room ID should be six letters.");
          return false;
        } else {
          return id.toUpperCase();
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let roomId = result.value;
        window.location.href = "/client.html?" + roomId;
      }
    });
  }

  export async function hostRoom() {
    Swal.fire({
      title: 'Choose a name for your room.',
      text: "This will appear at the top of your screen along with the room code.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Create',
      background: "var(--background)",
      allowOutsideClick: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        let roomName = result.value;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let valid = false;

        let code = "";
        for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];

        while (!valid) {
          await database.ref(`rooms/${code}`).once("value", (snapshot) => {
            if (snapshot.val() === null) {
              valid = true;
            } else {
              code = "";
              for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];
            }
          });
        }

        database.ref(`rooms/${code}`).set({
          name: roomName,
          users: {}
        }).then(() => {
          window.localStorage.setItem("writeboardTempId", code);
          window.location.href = "host.html";
        }).catch(() => {
          Swal.fire({
            title: "An error occurred.",
            icon: "error"
          });
        });
      }
    });
  }

  function updateSizing() {
    let height = (window.visualViewport.width * 0.176) + 170; // it works, don't mess it up
    (<HTMLDivElement>document.querySelector("div.banner")).style.height = `${height}px`;
    document.querySelectorAll("div.banner img").forEach((div) => {
      (<HTMLDivElement>div).style.height = `${height}px`;
      (<HTMLDivElement>div).style.left = `calc(50% - ${height * 2}px)`;
    });
  }

  window.onresize = updateSizing;
  window.onload = updateSizing;
}