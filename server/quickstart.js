"use strict"; // jshint ignore:line

const http = require('http');
const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
// const most = require('most');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


// Load client secrets from a local file.
const AuthConfig = JSON.parse(fs.readFileSync('client_secret.json'));
const clientSecret = AuthConfig.installed.client_secret;
const clientId = AuthConfig.installed.client_id;
const redirectUrl = AuthConfig.installed.redirect_uris[1];
const auth = new googleAuth();
const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

var authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});


const port = 3000;
const server = http.createServer();

const GET = 'GET';
const POST = 'POST';

server.on('listening', () => {
  console.log(`Server started on port ${port}`);
});

// server.on('request', (request, response) => {
//   console.log(request);
//   response.writeHead(200, {"Content-Type": "text/html"});
//   response.write(`<a href="${authUrl}">Auth With Google</a>`);
//   response.end();
// });

function Router(server) {
  let mids = [];

  server.on('request', function(request, response) {
    mids.forEach(function(mid) {
      if(request.method == mid.method && mid.path.test(request.url)) {
        mid.middleware(request, response);
      }
    });
  });

  function getFilter(p, f) {
    mids.push( {
      method: 'GET',
      path: new RegExp(p),
      middleware: f
    });
  }

  function postFilter(p, f) {
    mids.push( {
      method: 'POST',
      path: new RegExp(p),
      middleware: f
    });
  }

  return {
    get: getFilter,
    post: postFilter,
    on: mids.push
  };
}

const router = Router(server);

router.get('/(?!.+)', function(request, response) {
  console.log(request.url);
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write(`<a href=${authUrl}>Google</a>`);
  response.end();
});

router.get('/auth/google', function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  let reg = RegExp('.+code=(.+)');
  let code = reg.exec(request.url)[1];
  oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;

      var calendar = google.calendar('v3');
      calendar.events.list({
        auth: oauth2Client,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      },
      function(err, resp) {
        if (err) {
          response.write('The API returned an error: ' + err);
          return;
        }
        var events = resp.items;
        if (events.length === 0) {
          response.write('No upcoming events found.');
          } else {
          var str = "Upcoming 10 events:\n";
          for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var start = event.start.dateTime || event.start.date;
            str = str + ('%s - %s \n' , start, event.summary);
          }
          response.write(str);
        }
        response.end();
    });
  });
});

server.listen(port);
