const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더의 정적 파일(HTML, JS, CSS)을 제공
app.use(express.static('public'));

let waitingPlayer = null; // 대기 중인 플레이어

io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    if (waitingPlayer) {
        // 대기 중인 유저가 있으면 매칭 성사
        const roomName = 'room_' + socket.id;
        socket.join(roomName);
        waitingPlayer.join(roomName);

        // 첫 번째 유저는 흑(black), 두 번째 유저는 백(white)
        io.to(waitingPlayer.id).emit('gameStart', { color: 'black', turn: true });
        io.to(socket.id).emit('gameStart', { color: 'white', turn: false });

        // 돌을 두면 같은 방의 상대방에게 전달
        socket.on('placeStone', (data) => {
            socket.to(roomName).emit('receiveStone', data);
        });
        waitingPlayer.on('placeStone', (data) => {
            waitingPlayer.to(roomName).emit('receiveStone', data);
        });

        waitingPlayer = null; // 대기열 초기화
    } else {
        // 대기 중인 유저가 없으면 대기열에 등록
        waitingPlayer = socket;
        socket.emit('waiting', '상대방을 기다리는 중입니다...');
    }

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        console.log('유저 접속 종료:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});
