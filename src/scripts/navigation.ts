var Swal: any;
var firebase: FirebaseNamespace;

/** Variable to hold all the class instances to prevent cluttering up globals. */
let _wb_nav: {
  NAVIGATION?: Navigation,
} = {};

/** Initialises the navigation manager. */
function initNav() {
  _wb_nav.NAVIGATION = new Navigation();
}

window.addEventListener("load", initNav);

/**
 * Class to manage the homepage UI.
 * This involves scrolling to anchors as well as room management.
 */
class Navigation {
  database: FirebaseDatabase;
  local: boolean;

  constructor() {
    this.database = firebase.database();
    this.local = window.location.hostname === "localhost" || window.location.hostname === "192.168.1.1";
  }

  /**
   * When hosted on Netlify, the `/client.html` is at the `app` subdomain and the same for `/host.html` and `host`.
   * On my local development server, this won't work.
   * This is basically a janky workaround.
   */
  route(r: string) {
    if (r === "client") return this.local ? "//localhost/client.html" : "//app.writeboard.ga/";
    else if (r === "host") return this.local ? "//localhost/host.html" : "//host.writeboard.ga/";
  }

  /** Starts and manages the join room flow with `sweetalert2`. */
  joinRoom() {
    Swal.fire({
      title: 'Enter the room ID.',
      text: "Ask the room host if you don't know the room ID.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Join',
      background: "var(--background)",
      showLoaderOnConfirm: true,
      allowOutsideClick: true,
      preConfirm: async (id: string) => {
        let regex = new RegExp("^[a-zA-Z]{6}$")
        if (!regex.test(id)) {
          Swal.showValidationMessage("Room ID should be six letters.");
          return false;
        } else {
          let valid = "invalid";
          await this.database.ref(`rooms/${id.toUpperCase()}`).once("value", (snapshot) => {
            if (snapshot.val() !== null) {
              if (snapshot.val().authLevel === 0) {
                valid = "valid";
              } else {
                valid = "locked";
              }
            }
          });

          if (valid === "invalid") Swal.showValidationMessage("Room cannot be found.");
          if (valid === "locked") Swal.showValidationMessage("Room is locked.");
          return valid === "valid" ? id.toUpperCase() : false;
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        let roomId = result.value;
        window.location.href = `${this.route("client")}?${roomId}`;
      }
    });
  }

  /** Starts and manages the host room flow with `sweetalert2`. */
  async hostRoom() {
    Swal.fire({
      title: 'Name your room.',
      text: "This will appear at the top of your screen along with the room code.",
      icon: "info",
      input: 'text',
      confirmButtonText: 'Create',
      background: "var(--background)",
      allowOutsideClick: true,
      preConfirm: (name: string) => {
        if (name.length === 0) {
          Swal.showValidationMessage("You must name your room!");
          return false;
        } else {
          return name;
        }
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        let roomName = result.value;
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let valid = false;

        let code = "";
        for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];

        // sketchy room ID generation
        while (!valid) {
          await this.database.ref(`rooms/${code}`).once("value", (snapshot) => {
            if (snapshot.val() === null) {
              valid = true;
            } else {
              code = "";
              for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * 26)];
            }
          });
        }

        /**
         * Auth levels are as follows:
         * 
         * 0 - no authentication at all, public
         * 1 - waiting room, **not implemented**
         * 2 - requires login, **not implemented**
         * 3 - requires login and waiting room, **not implemented**
         * 4 - locked completely, nobody new can join
         */
        this.database.ref(`rooms/${code}`).set({
          name: roomName,
          authLevel: 0,
          users: {}
        }).then(() => {
          if (!this.local) document.cookie = `writeboardTempId=${code};domain=.writeboard.ga`;
          else window.localStorage.setItem("writeboardTempId", code);
          window.location.href = this.route("host");
        }).catch(() => {
          Swal.fire({
            title: "An error occurred.",
            icon: "error",
            background: "var(--background)"
          });
        });
      }
    });
  }

  /** Opens the settings menu (TODO: implement) */
  settings() { }
}