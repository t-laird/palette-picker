const express = require('express');
const app = express(); //instantiate a new express server
const bodyParser = require('body-parser'); //parse the request object
const path = require('path'); //path for accessing assets in public directory


const environment = process.env.NODE_ENV || 'development'; //fallback to development configuration but prioritize env.
const configuration = require('./knexfile')[environment]; //knex configuration - references the appropriate configuration
const database = require('knex')(configuration); //invokes the knex function to access database, passes in configuration as a parameter

app.set('port', process.env.PORT || 3000); //sets port to process port, falls back to LH 3000
app.use(bodyParser.json()); //uses json bodyparser
app.use(bodyParser.urlencoded({extended: true})); //also use urlencoded in case of mistake
app.use(express.static(path.join(__dirname, 'public'))); //uses default public path to server up index.html file by default

app.listen(app.get('port'), () => { //instructs express which port to listen on, uses get to retrieve that port from express settings
  console.log(`Palette picker listening on port ${app.get('port')}.`);
});

app.get('/api/v1/palettes/', (request, response) => { //get endpoint for api/v1/palettes
  database('palettes').select() //selects all rows in palettes table
    .then(palettes => {
      return response.status(200).json({palettes}); //responds w/ status 200 and all palettes found.
    })
    .catch(palettes => { //catch for internal server error on getting palettes
      return response.status(500).json({error: 'could not retrieve palettes'});
    });
});

app.get('/api/v1/projects/', (request, response) => { //get endpoint for api/v1/projects
  database('projects').select() //selects all rows in projects table
    .then(projects => {
      return response.status(200).json({projects}); //responds w/ status 200 and all projects found.
    })
    .catch(() => { //catch for internal server error on getting projects
      return response.status(500).json({error: 'could not retrieve folders'});
    });
});

app.post('/api/v1/palettes/', (request, response) => { //post endpoint for api/v1/palettes
  const { palette } = request.body; // gets palette object from request body

  let reqParams = ['color1', 'color2', 'color3', 'color4', 'color5', 'palette_name', 'project_id']; //list of expected params in request.palette object

  for (let param of reqParams) { //validates expected params against actual object
    if (!palette[param]) {
      return response.status(422).json({error: `Please enter a valid ${param}`}); //sends 422 if any of said parameters are missing
    }
  }

  database('palettes').insert(palette).returning('palette_id') //inserts palette into palette table and returns the palette id
    .then((pId) => {
      return response.status(200).json(pId[0]); //returns an array w/ palette id contained, strip that out and return value
    })
    .catch(() => { //catch for internal server error on palette insertion
      return response.status(500).json({error: 'Error inserting palette'});
    });
});

app.post('/api/v1/projects/', (request, response) => { //post endpoint for api/v1/projects
  const { project } = request.body; // gets project object from request body

  if (!project.project_name) {
    return response.status(422).json({error: 'Please enter a valid project name'}); //send 422 error if there is an invalid project
  }

  database('projects').insert(project).returning('project_id') //inserts the project into the project table and returns the new project id
    .then((pId) => {
      return response.status(200).json(pId[0]); //strips project id e.g. [ 3 ] from array
    })
    .catch(() => { //catch for internal server error on project insertion
      return response.status(500).json({error: 'Error inserting project'});
    });
});

app.delete('/api/v1/palettes/:id', (request, response) => { //delete endpoint for a single palette
    database('palettes').where('palette_id', request.params.id).delete() //deletes all palettes where the palette_id matches the request id. never more than one.
      .then(() => {
        response.sendStatus(204); //sends back a status with no payload
      })
      .catch((error) => {
        response.status(500).json({ error }); //catch for error handling
      });
});

app.delete('/api/v1/projects/:id', (request, response) => { //delete endpoint for a single project
    database('palettes').where('project_id', request.params.id).delete() //first delete all associated palettes with the project_id matching the request parameter
      .then(() => {
        database('projects').where('project_id', request.params.id).delete() //then deletes the project as specified by the request
          .then(() => {
            return response.sendStatus(204); //sends back a status with no payload
          })
          .catch(( error ) => {
            return response.status(500).json({ error }); //catch for error handling
          });
      })
      .catch((error ) => {
        response.status(500).json({ error }); //catch in case initial delete fails
      });
});

module.exports = app; //export for testing server file