require('dotenv').config();

const app = require('express')();
const httpServer = require('http').createServer(app);

const io = require('socket.io')(httpServer, {
  cors: true,
  origins: ['*']
});

const rooms = {};

app.get('/', (req, res) => {
  res.send('Server is Running...');
});

io.on("connection", (socket) => {
  console.log("user connected || Rooms:", rooms);
  io.emit('allRooms', rooms);

  socket.on('joinRoom', ({ roomId, userName, userResponse }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push({ id: socket.id, name: userName, response: userResponse });
    socket.join(roomId);
    console.log(`A player joined the room :: ${roomId}`);
    console.log(`Rooms :: ${JSON.stringify(rooms)}`);
    socket.to(roomId).emit('joinRoom', `${userName} joined the room`);
    io.to(roomId).emit('roomData', rooms[roomId]);
    io.emit('allRooms', rooms);
  });

  socket.on('userResponse', ({ roomId, userName, userResponse }) => {

    const updateResponse = (array, id) => {
      const obj = array.find(item => item.id === id);
      if (obj) {
        obj.response = userResponse;
      }
    };

    updateResponse(rooms[roomId], socket.id);

    console.log(userName + " responded in room:: " + roomId + " :: " + userResponse)
    console.log(`Rooms :: ${JSON.stringify(rooms)}`);

    io.to(roomId).emit('roomData', rooms[roomId]);
    socket.to(roomId).emit('joinRoom', `${userName} submitted the response`);
    io.emit('allRooms', rooms);
    
  });


  socket.on('disconnect', () => {
    console.log('user disconnected');
    for (const roomId in rooms) {
      const data = rooms[roomId].filter((user) => user.id === socket.id);
      if (data.length !== 0) {
        let leftUser = data[0].name;
        rooms[roomId] = rooms[roomId].filter((user) => user.id !== socket.id);
        socket.to(roomId).emit('joinRoom', `${leftUser} left the room`);
      }
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
      io.to(roomId).emit('roomData', rooms[roomId]);
    }
    io.emit('allRooms', rooms);
    console.log(`Rooms :: ${JSON.stringify(rooms)}`);
  });
});

const PORT = process.env.PORT;
httpServer.listen(PORT, () => console.log('Server is running on port ' + PORT));
