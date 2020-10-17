# Polypol

### Table of contents
- [Setup](#setup)
   - [Node Server](#node-server)
   - [Backend C# Server](#backend-c-server)
   - [Database](#database)
- [Configuration](#configuration)
   - [The .env file](#the-env-file) 
   - [The news.txt file](#the-newstxt-file)
   - [Locations](#locations)
- [Contact](#contact)
## Setup
- Make sure you have [node.js](https://nodejs.org/en/download/) and the [.NET Core Runtime](https://dotnet.microsoft.com/download) installed.
- Install [mongodb](https://docs.mongodb.com/manual/installation/) and make sure it is running.
- Clone the [polypol node](https://github.com/hertelukas/polypol) repository and the [polypol C#](https://github.com/hertelukas/polypolServer) server.
### Node Server
The node server handles all client requests.
- In the directory of the cloned node server, run `npm install` to install all dependencies. 
- Run the server with `node app.js`.  The default port is 3000.
- Visit `localhost:3000` or ```<ip address>:3000```.

### Backend C# Server
The C# backend server updates the database every month. 
- In the directory run ```dotnet restore``` to install missing dependencies.
- Every time you want to update a branch, run the program with ```dotnet run```. It saves the current progress to a file called ```progress.txt``` You can set the starting month with ```<year> <month>```
- Optional: I strongly recommend setting up a cron task for updating the database.

### Database
To add locations to the database add a collection called locations. The default locations are under `/data/locations.json`. I recommend importing this file.

## Configuration
### The .env file
You can add a .env file to your root to specify certain variables.
| Name        | Default                                 | Description                        |
|-------------|-----------------------------------------|------------------------------------|
| DATABASEURL | `mongodb://localhost:27017/polypol`     | The link to the database           |
| PORT        | `3000`                                  | The port where polypol is visible. |
| SECRET      | `Please change me`                      | Should be changed, default express session password |
| NODE_ENV    | `null`                                  | The environment the application is running in. If it is `development` it won't force `HTTPS` |


### The news.txt file
The news.txt file is a file in the root directory of the backend C# server. You can change the news that should get displayed here. They have to be in order and formatted like this:
```c
<year> <month>        //Year and month the news should appear
<factor>              //The factor all beds should get multiplied by (1.1 means a 10% increase in beds)
<title>               //Title, can be any string
<Content>             //Message, can be any string
```

### Locations
You can change locations in your database. The default preinstalled locations are under `/data/locations.json` but you can add and remove locations, however you want.
A location has to have following properties. 
| Name | Description | Type |
|------|-------------|------|
| country | The name of the country the city is in | String |
| city | The name of the city | String |
| value | How expensive rent is in this city | Number |
| visitors | Number of visitors | Number |
| beds | Beds in this city. Set to 0, when a user buys a branch, this value gets updated | Number |
| latitude | Latitude of the city `<XX.XXX>` | Number |
| longitude | Longitude of the city `<XX.XXX>` | Number |
| region | Region the city is in* | String |

*The defualt regions are Africa, America, Asia, Europe, South America and Oceania. They let you change the visitors in a current region by script. (Maybe there is a boom in Asia, and you can update all cities in asia at once)

## Contact
You can reach me on [discord](https://discord.gg/yDNHHue)