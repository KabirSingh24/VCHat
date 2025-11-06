// import React, { useEffect, useRef, useState } from 'react';
// import { Badge, IconButton, TextField, Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import SockJS from 'sockjs-client';
// import styles from "../styles/videoComponent.module.css";
// import server from "../enviroment";
// import { useNavigate } from 'react-router-dom';

// const server_url = server;
// var connections = {};
// const peerConfigConnections = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// export default function VideoMeetComponent() {
//   const router=useNavigate();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(String(Date.now()) + Math.floor(Math.random() * 10000));
//   // separate refs: lobby preview and in-call local video
//   const localVideoLobbyRef = useRef(null);
//   const localVideoRef = useRef(null);

//   const [videoAvailable, setVideoAvailable] = useState(false);
//   const [audioAvailable, setAudioAvailable] = useState(false);
//   const [video, setVideo] = useState(true); // user wants camera on/off
//   const [audio, setAudio] = useState(true); // user wants mic on/off
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(true);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [askForUsername, setAskForUsername] = useState(true);
//   const [username, setUsername] = useState("");
//   const [videos, setVideos] = useState([]);

//   useEffect(() => {
//     checkDeviceCapabilities();
//     // cleanup on unmount
//     return () => {
//       try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//       Object.values(connections).forEach(pc => {
//         try { pc.close(); } catch (e) { }
//       });
//       connections = {};
//     };
//   }, []);

//   useEffect(() => {
//     // when screen state becomes true, start share; when false, restore camera/mic
//     if (screen) {
//       startScreenShare();
//     } else {
//       // restore camera/mic if previously available
//       updateLocalStream({ useCamera: video, useMic: audio }).catch(() => { });
//     }
//   }, [screen]);

//   // ensure UI video elements get the current local stream if it changes
//   useEffect(() => {
//     if (window.localStream) {
//       if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = window.localStream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = window.localStream;
//     }
//   }, [localVideoLobbyRef.current, localVideoRef.current]); // run when refs become available

//   // ---------- Device capability check ----------
//   useEffect(() => {
//     const setupLobbyPreview = async () => {
//       try {
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         setVideoAvailable(devices.some(d => d.kind === "videoinput"));
//         setAudioAvailable(devices.some(d => d.kind === "audioinput"));
//         setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

//         // 🔥 start local camera preview for lobby
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: false, // don’t ask for mic yet
//         });

//         window.localStream = stream;

//         if (localVideoLobbyRef.current) {
//           localVideoLobbyRef.current.srcObject = stream;
//         }
//       } catch (err) {
//         console.error("Error starting lobby preview:", err);
//       }
//     };

//     setupLobbyPreview();

//     // cleanup when component unmounts
//     return () => {
//       try {
//         window.localStream?.getTracks().forEach((t) => t.stop());
//       } catch (e) { }
//       Object.values(connections).forEach((pc) => {
//         try {
//           pc.close();
//         } catch (e) { }
//       });
//       connections = {};
//     };
//   }, []);


//   const checkDeviceCapabilities = async () => {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       setVideoAvailable(devices.some(d => d.kind === 'videoinput'));
//       setAudioAvailable(devices.some(d => d.kind === 'audioinput'));
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     } catch (e) {
//       console.log("Error enumerating devices:", e);
//     }
//   };

//   // ---------- update local stream (camera/mic) ----------
//   // accepts options so it doesn't rely on stale state
//   const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
//     // get new stream (camera or black+silence)
//     let newStream;
//     try {
//       if (useCamera || useMic) {
//         newStream = await navigator.mediaDevices.getUserMedia({
//           video: useCamera && videoAvailable ? true : false,
//           audio: useMic && audioAvailable ? true : false
//         });
//       } else {
//         // create silent/black stream
//         newStream = new MediaStream([black(), silence()]);
//       }
//     } catch (err) {
//       console.log("getUserMedia failed, falling back to black/silence:", err);
//       newStream = new MediaStream([black(), silence()]);
//     }

//     // stop old tracks
//     try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }

//     window.localStream = newStream;
//     // attach to both lobby preview and in-call local video (if present)
//     if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = newStream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

//     // replace tracks on every peer connection (if RTCRtpSender supports replaceTrack)
//     Object.values(connections).forEach(pc => {
//       try {
//         const senders = pc.getSenders ? pc.getSenders() : [];
//         // replace video
//         if (useCamera && newStream.getVideoTracks()[0]) {
//           const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//           if (videoSender && videoSender.replaceTrack) {
//             videoSender.replaceTrack(newStream.getVideoTracks()[0]);
//           } else if (pc.addTrack) {
//             pc.addTrack(newStream.getVideoTracks()[0], newStream);
//           }
//         } else {
//           // disable video sender if exists
//           const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//           if (videoSender && videoSender.replaceTrack) {
//             try { videoSender.replaceTrack(null); } catch (e) { /* some browsers */ }
//           }
//         }

//         // replace audio
//         if (useMic && newStream.getAudioTracks()[0]) {
//           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
//           if (audioSender && audioSender.replaceTrack) {
//             audioSender.replaceTrack(newStream.getAudioTracks()[0]);
//           } else if (pc.addTrack) {
//             pc.addTrack(newStream.getAudioTracks()[0], newStream);
//           }
//         } else {
//           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
//           if (audioSender && audioSender.replaceTrack) {
//             try { audioSender.replaceTrack(null); } catch (e) { /* ignore */ }
//           }
//         }
//       } catch (e) {
//         console.log("Error replacing tracks on peer:", e);
//       }
//     });
//   };

//   // ---------- screen share flow ----------
//   const startScreenShare = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//       // stop old and set new
//       try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//       window.localStream = stream;
//       if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = stream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//       // add to peers
//       Object.values(connections).forEach(pc => {
//         try {
//           // add tracks
//           stream.getTracks().forEach(track => pc.addTrack(track, stream));
//           // renegotiate
//           pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
//             sendSignal(pc.remoteId, { sdp: pc.localDescription });
//           }).catch(e => console.log("Offer/renegotiate error:", e));
//         } catch (e) { console.log(e); }
//       });

//       // when user stops screen share, restore camera/mic
//       stream.getTracks().forEach(track => track.onended = () => {
//         setScreen(false);
//         updateLocalStream({ useCamera: video, useMic: audio }).catch(() => { });
//       });
//     } catch (err) {
//       console.log("Screen share canceled or denied:", err);
//       setScreen(false); // make sure UI stays consistent
//     }
//   };

//   // ---------- helpers for silence / black ----------
//   let silence = () => {
//     let ctx = new (window.AudioContext || window.webkitAudioContext)();
//     let oscillator = ctx.createOscillator();
//     let dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     const track = dst.stream.getAudioTracks()[0];
//     // make sure it's disabled by default
//     try { track.enabled = false; } catch (e) { }
//     return track;
//   };
//   let black = ({ width = 640, height = 480 } = {}) => {
//     let canvas = Object.assign(document.createElement("canvas"), { width, height });
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     let stream = canvas.captureStream();
//     const track = stream.getVideoTracks()[0];
//     try { track.enabled = false; } catch (e) { }
//     return track;
//   };

//   // ---------- signaling helpers ----------
//   const sendSignal = (toId, data) => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "signal", toId, fromId: socketIdRef.current, data }));
//   };

//   const gotMessageFromServer = (fromId, message) => {
//     const signal = JSON.parse(message);
//     if (!connections[fromId]) {
//       const pc = new RTCPeerConnection(peerConfigConnections);
//       pc.remoteId = fromId;
//       pc.onicecandidate = event => {
//         if (event.candidate) sendSignal(fromId, { ice: event.candidate });
//       };
//       pc.ontrack = (evt) => {
//         // when remote track arrives set remote stream
//         addRemoteVideo(fromId, evt.streams && evt.streams[0] ? evt.streams[0] : new MediaStream(evt.track ? [evt.track] : []));
//       };
//       // add existing local tracks
//       try {
//         if (window.localStream) {
//           window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//         }
//       } catch (e) { }
//       connections[fromId] = pc;
//     }
//     const pc = connections[fromId];

//     if (signal.sdp) {
//       pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
//         if (signal.sdp.type === "offer") {
//           return pc.createAnswer();
//         }
//       }).then(answerDesc => {
//         if (!answerDesc) return;
//         return pc.setLocalDescription(answerDesc).then(() => {
//           sendSignal(fromId, { sdp: pc.localDescription });
//         });
//       }).catch(e => console.log(e));
//     }

//     if (signal.ice) {
//       pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
//     }
//   };

//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(prev => {
//       if (prev.find(v => v.socketId === socketId)) {
//         return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else {
//         return [...prev, { socketId, stream }];
//       }
//     });
//   };

//   // ---------- socket connect ----------
//   const connectToSocketServer = () => {
//     socketRef.current = new SockJS(`${server_url}/ws`);
//     socketRef.current.onopen = () => {
//       console.log(" Connected to WebSocket server");
//       socketRef.current.send(JSON.stringify({
//         type: "join-call",
//         roomId: window.location.href,
//         username,
//         clientId: socketIdRef.current
//       }));
//     };

//     socketRef.current.onmessage = (event) => {
//       const msg = JSON.parse(event.data);
//       switch (msg.type) {
//         case "signal":
//           gotMessageFromServer(msg.fromId, JSON.stringify(msg.data));
//           break;
//         case "user-joined":
//           handleUserJoined(msg.userId, msg.clients);
//           break;
//         case "user-left":
//           setVideos(v => v.filter(x => x.socketId !== msg.userId));
//           delete connections[msg.userId];
//           break;
//         case "chat-message":
//           addMessage(msg.data, msg.sender, msg.fromId);
//           break;
//         default:
//           console.log("Unknown message type:", msg.type);
//       }
//     };
//   };

//   const handleUserJoined = (userId, clients) => {
//     if (!clients || !Array.isArray(clients)) {
//       console.warn(" handleUserJoined called without valid clients list:", clients);
//       return;
//     }
//     clients.forEach(socketListId => {
//       if (socketListId === socketIdRef.current) return;
//       if (!connections[socketListId]) {
//         const pc = new RTCPeerConnection(peerConfigConnections);
//         pc.remoteId = socketListId;
//         pc.onicecandidate = event => {
//           if (event.candidate) {
//             socketRef.current.send(JSON.stringify({
//               type: "signal", toId: socketListId, fromId: socketIdRef.current, data: { ice: event.candidate }
//             }));
//           }
//         };
//         pc.ontrack = (evt) => addRemoteVideo(socketListId, evt.streams[0]);
//         try {
//           if (window.localStream) {
//             window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//           } else {
//             // add fallback silent/black tracks so the connection has senders
//             const fakeStream = new MediaStream();
//             fakeStream.addTrack(black());
//             fakeStream.addTrack(silence());
//             pc.addTrack(fakeStream.getVideoTracks()[0], fakeStream);
//             pc.addTrack(fakeStream.getAudioTracks()[0], fakeStream);
//           }
//         } catch (e) { console.log(e); }
//         connections[socketListId] = pc;
//         // create offer
//         pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
//           socketRef.current.send(JSON.stringify({
//             type: "signal",
//             toId: socketListId,
//             fromId: socketIdRef.current,
//             data: { sdp: pc.localDescription }
//           }));
//         }).catch(e => console.log(e));
//       }
//     });
//   };

//   // ---------- chat ----------
//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };
//   const sendMessage = () => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
//   };

//   // ---------- UI handlers ----------
//   const handleVideo = () => {
//     const videoTrack = window.localStream?.getVideoTracks()[0];
//     if (videoTrack) {
//       const newState = !videoTrack.enabled;
//       videoTrack.enabled = newState;
//       setVideo(newState);
//     }
//   };

//   const handleAudio = () => {
//     const audioTrack = window.localStream?.getAudioTracks()[0];
//     if (audioTrack) {
//       const newState = !audioTrack.enabled;
//       audioTrack.enabled = newState;
//       setAudio(newState);
//     }
//   };
//   const handleScreenToggle = () => {
//     // toggle; effect will start or stop screen share
//     setScreen(prev => !prev);
//   };

//   const start = async () => {
//     setAskForUsername(false);
//     // ensure local stream is initialized before connecting to peers
//     try {
//       await updateLocalStream({ useCamera: video, useMic: audio });
//     } catch (e) { console.log(e); }
//     connectToSocketServer();
//   };

//   const handleEndCall = () => {
//     try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
//     Object.values(connections).forEach(pc => { try { pc.close(); } catch (e) { } });
//     connections = {};
//     router ( "/home");
//   };

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter into Lobby </h2>
//           <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={start}>Connect</Button>
//           <div>
//             {/* lobby preview - uses separate ref */}
//             <video
//               ref={localVideoLobbyRef}
//               autoPlay
//               playsInline
//               muted
//               style={{ width: 320, height: 240, background: "black" }}
//             />
//           </div>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal ? <div className={styles.chatRoom}>
//             <div className={styles.chatContainer}>
//               <h1>Chat</h1>
//               <div className={styles.chattingDisplay}>
//                 {messages.length !== 0 ? messages.map((item, index) => (
//                   <div style={{ marginBottom: "20px" }} key={index}>
//                     <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                     <p>{item.data}</p>
//                   </div>
//                 )) : <p>No Messages Yet</p>}
//               </div>
//               <div className={styles.chattingArea}>
//                 <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
//                 <Button variant='contained' onClick={sendMessage}>Send</Button>
//               </div>
//             </div>
//           </div> : <></>}

//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideo} style={{ color: "white" }}>
//               {video ? <VideocamIcon /> : <VideocamOffIcon />}
//             </IconButton>

//             <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//               <CallEndIcon />
//             </IconButton>

//             <IconButton onClick={handleAudio} style={{ color: "white" }}>
//               {audio ? <MicIcon /> : <MicOffIcon />}
//             </IconButton>

//             {screenAvailable ? (
//               <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>
//                 {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
//               </IconButton>
//             ) : null}

//             <Badge badgeContent={newMessages} max={999} color='primary'>
//               <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                 <ChatIcon />
//               </IconButton>
//             </Badge>
//           </div>

//           {/* in-call local video uses its own ref */}
//           <video
//             className={styles.meetUserVideo}
//             ref={localVideoRef}
//             autoPlay
//             playsInline
//             muted
//             style={{ width: 320, height: 240 }}
//           />

//           <div className={styles.conferenceView}>
//             {videos.map((v) => (
//               <div key={v.socketId}>
//                 <video
//                   data-socket={v.socketId}
//                   ref={ref => {
//                     if (ref && v.stream) {
//                       ref.srcObject = v.stream;
//                     }
//                   }}
//                   autoPlay
//                   playsInline
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// import React, { useEffect, useRef, useState } from 'react';
// import { Badge, IconButton, TextField, Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import styles from '../styles/videoComponent.module.css';
// import SockJS from 'sockjs-client';
// import server from "../enviroment";

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
// };

// let connections = {};

// export default function VideoMeetComponent() {
//   const localVideoref = useRef();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(null);

//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [username, setUsername] = useState("");
//   const [askForUsername, setAskForUsername] = useState(true);

//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(false);

//   useEffect(() => {
//     getPermissions();
//   }, []);

//   const getPermissions = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       window.localStream = stream;
//       if (localVideoref.current) localVideoref.current.srcObject = stream;
//       setVideoAvailable(true);
//       setAudioAvailable(true);
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     } catch (err) {
//       console.error("Media access error:", err);
//     }
//   };

//   const connect = () => {
//     if (!username.trim()) return;
//     setAskForUsername(false);
//     connectToSocketServer();
//   };

//   const connectToSocketServer = () => {
//     const roomId = window.location.pathname.split("/").pop();
//     socketRef.current = new SockJS("https://vchat-rp52.onrender.com/ws");

//     socketRef.current.onopen = () => {
//       console.log("Connected to signaling server");
//       socketRef.current.send(JSON.stringify({ type: "join-call", roomId }));
//     };

//     socketRef.current.onmessage = async (event) => {
//       const msg = JSON.parse(event.data);

//       switch (msg.type) {
//         case "connection-success":
//           socketIdRef.current = msg.id;
//           console.log("Connected:", msg.id);
//           break;

//         case "existing-users":
//           msg.users.forEach((id) => setupPeerConnection(id, true));
//           break;

//         case "user-joined":
//           setupPeerConnection(msg.userId, false);
//           break;

//         case "signal":
//           await handleSignal(msg.fromId, msg.data);
//           break;

//         case "user-left":
//           removeVideo(msg.userId);
//           break;

//         case "chat-message":
//           addMessage(msg.data, msg.sender);
//           break;

//         default:
//           break;
//       }
//     };

//     socketRef.current.onclose = () => console.log("Socket closed");
//   };

//   const setupPeerConnection = async (id, isOfferer) => {
//     if (connections[id]) return;

//     const pc = new RTCPeerConnection(peerConfigConnections);
//     connections[id] = pc;

//     window.localStream.getTracks().forEach((track) => pc.addTrack(track, window.localStream));

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current.send(JSON.stringify({
//           type: "signal",
//           toId: id,
//           data: JSON.stringify({ ice: event.candidate }) // ✅ send as string
//         }));
//       }
//     };

//     pc.ontrack = (event) => {
//       setVideos((prev) => {
//         const exists = prev.find((v) => v.socketId === id);
//         if (exists) {
//           return prev.map((v) => v.socketId === id ? { ...v, stream: event.streams[0] } : v);
//         }
//         return [...prev, { socketId: id, stream: event.streams[0] }];
//       });
//     };

//     if (isOfferer) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socketRef.current.send(JSON.stringify({
//         type: "signal",
//         toId: id,
//         data: JSON.stringify({ sdp: pc.localDescription }) // ✅ send as string
//       }));
//     }
//   };

//   const handleSignal = async (fromId, data) => {
//     const parsed = typeof data === "string" ? JSON.parse(data) : data;
//     if (!connections[fromId]) setupPeerConnection(fromId, false);

//     const pc = connections[fromId];
//     if (parsed.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp));
//       if (parsed.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socketRef.current.send(JSON.stringify({
//           type: "signal",
//           toId: fromId,
//           data: JSON.stringify({ sdp: pc.localDescription }) // ✅ send as string
//         }));
//       }
//     } else if (parsed.ice) {
//       try {
//         await pc.addIceCandidate(new RTCIceCandidate(parsed.ice));
//       } catch (e) {
//         console.error("ICE add error:", e);
//       }
//     }
//   };

//   const removeVideo = (id) => {
//     setVideos((prev) => prev.filter((v) => v.socketId !== id));
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//     }
//   };

//   const addMessage = (data, sender) => {
//     setMessages((prev) => [...prev, { data, sender }]);
//     setNewMessages((prev) => prev + 1);
//   };

//   const sendMessage = () => {
//     if (!message.trim()) return;
//     socketRef.current.send(JSON.stringify({
//       type: "chat-message",
//       data: message,
//       sender: username
//     }));
//     setMessage("");
//   };

//   const handleVideo = () => setVideo(!video);
//   const handleAudio = () => setAudio(!audio);
//   const handleScreen = () => setScreen(!screen);
//   const handleEndCall = () => {
//     try {
//       localVideoref.current.srcObject?.getTracks().forEach((t) => t.stop());
//     } catch (e) {}
//     window.location.href = "/";
//   };

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter into Lobby</h2>
//           <TextField
//             id="outlined-basic"
//             label="Username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             variant="outlined"
//           />
//           <Button variant="contained" onClick={connect}>Connect</Button>

//           <div>
//             <video ref={localVideoref} autoPlay muted></video>
//           </div>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal && (
//             <div className={styles.chatRoom}>
//               <div className={styles.chatContainer}>
//                 <h1>Chat</h1>
//                 <div className={styles.chattingDisplay}>
//                   {messages.length ? messages.map((item, index) => (
//                     <div style={{ marginBottom: "20px" }} key={index}>
//                       <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                       <p>{item.data}</p>
//                     </div>
//                   )) : <p>No Messages Yet</p>}
//                 </div>
//                 <div className={styles.chattingArea}>
//                   <TextField
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     id="outlined-basic"
//                     label="Enter Your chat"
//                     variant="outlined"
//                   />
//                   <Button variant="contained" onClick={sendMessage}>Send</Button>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideo} style={{ color: "white" }}>
//               {video ? <VideocamIcon /> : <VideocamOffIcon />}
//             </IconButton>
//             <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//               <CallEndIcon />
//             </IconButton>
//             <IconButton onClick={handleAudio} style={{ color: "white" }}>
//               {audio ? <MicIcon /> : <MicOffIcon />}
//             </IconButton>
//             {screenAvailable && (
//               <IconButton onClick={handleScreen} style={{ color: "white" }}>
//                 {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
//               </IconButton>
//             )}
//             <Badge badgeContent={newMessages} max={999} color="orange">
//               <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                 <ChatIcon />
//               </IconButton>
//             </Badge>
//           </div>

//           <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

//           <div className={styles.conferenceView}>
//             {videos.map((video) => (
//               <div key={video.socketId}>
//                 <video
//                   data-socket={video.socketId}
//                   ref={(ref) => {
//                     if (ref && video.stream) {
//                       ref.srcObject = video.stream;
//                     }
//                   }}
//                   autoPlay
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






















// // ... keep your imports the same
// import React, { useEffect, useRef, useState } from "react";
// import { Badge, IconButton, TextField, Button } from "@mui/material";
// import VideocamIcon from "@mui/icons-material/Videocam";
// import VideocamOffIcon from "@mui/icons-material/VideocamOff";
// import CallEndIcon from "@mui/icons-material/CallEnd";
// import MicIcon from "@mui/icons-material/Mic";
// import MicOffIcon from "@mui/icons-material/MicOff";
// import ScreenShareIcon from "@mui/icons-material/ScreenShare";
// import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
// import ChatIcon from "@mui/icons-material/Chat";
// import styles from "../styles/videoComponent.module.css";
// import SockJS from "sockjs-client";
// import server from "../enviroment";

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// let connections = {};

// export default function VideoMeetComponent() {
//   const localVideoref = useRef();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(null);

//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [username, setUsername] = useState("");
//   const [askForUsername, setAskForUsername] = useState(true);

//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(false);

//   // -----------------------------------
//   // 🔹 1. Permission request + local video setup
//   // -----------------------------------
//   useEffect(() => {
//     console.log("[useEffect] component mounted -> getPermissions()");
//     getPermissions();
//   }, []);

//   const getPermissions = async () => {
//     console.log("[getPermissions] requesting media...");
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       console.log("[getPermissions] got stream:", stream);

//       window.localStream = stream;
//       if (localVideoref.current) {
//         console.log("[getPermissions] attaching stream to local video...");
//         localVideoref.current.srcObject = stream;

//         // Force autoplay for mobile (Safari/Chrome)
//         localVideoref.current
//           .play()
//           .then(() => console.log("[getPermissions] local video playing ✅"))
//           .catch((err) =>
//             console.error("[getPermissions] play() failed ❌", err)
//           );
//       } else {
//         console.warn("[getPermissions] localVideoref not ready yet");
//       }

//       setVideoAvailable(true);
//       setAudioAvailable(true);
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//       console.log(
//         "[getPermissions] videoAvailable:",
//         true,
//         "audioAvailable:",
//         true,
//         "screenAvailable:",
//         !!navigator.mediaDevices.getDisplayMedia
//       );
//     } catch (err) {
//       console.error("[getPermissions] Media access error ❌:", err);
//     }
//   };

//   // -----------------------------------
//   // 🔹 2. Connect to signaling server
//   // -----------------------------------
//   const connect = () => {
//     console.log("[connect] username:", username);
//     if (!username.trim()) return;
//     setAskForUsername(false);
//     connectToSocketServer();
//   };

//   const connectToSocketServer = () => {
//     const roomId = window.location.pathname.split("/").pop();
//     console.log(
//       "[connectToSocketServer] connecting to https://vchat-rp52.onrender.com/ws roomId:",
//       roomId
//     );
//     socketRef.current = new SockJS("https://vchat-rp52.onrender.com/ws");

//     socketRef.current.onopen = () => {
//       console.log("[SockJS] onopen - connected to signaling server");
//       socketRef.current.send(JSON.stringify({ type: "join-call", roomId }));
//       console.log("[SockJS] sent join-call", { type: "join-call", roomId });
//     };

//     socketRef.current.onmessage = async (event) => {
//       console.log("[SockJS] onmessage RAW:", event.data);
//       const msg = JSON.parse(event.data);
//       console.log("[SockJS] parsed message:", msg);

//       switch (msg.type) {
//         case "connection-success":
//           socketIdRef.current = msg.id;
//           console.log("[SockJS] connection-success -> socketIdRef:", msg.id);
//           break;

//         case "existing-users":
//           console.log("[SockJS] existing-users:", msg.users);
//           msg.users.forEach((id) => setupPeerConnection(id, true));
//           break;

//         case "user-joined":
//           console.log("[SockJS] user-joined:", msg.userId);
//           setupPeerConnection(msg.userId, false);
//           break;

//         case "signal":
//           console.log("[SockJS] signal received from:", msg.fromId);
//           await handleSignal(msg.fromId, msg.data);
//           break;

//         case "user-left":
//           console.log("[SockJS] user-left:", msg.userId);
//           removeVideo(msg.userId);
//           break;

//         case "chat-message":
//           console.log("[SockJS] chat-message:", msg.data, "from:", msg.sender);
//           addMessage(msg.data, msg.sender);
//           break;

//         default:
//           console.warn("[SockJS] unknown message type:", msg.type);
//           break;
//       }
//     };

//     socketRef.current.onclose = () => console.log("[SockJS] connection closed");
//   };

//   // -----------------------------------
//   // 🔹 3. Peer connection handling
//   // -----------------------------------
//   const setupPeerConnection = async (id, isOfferer) => {
//     if (connections[id]) return;
//     console.log("[setupPeerConnection] creating peer for:", id, "offerer:", isOfferer);

//     const pc = new RTCPeerConnection(peerConfigConnections);
//     connections[id] = pc;

//     if (window.localStream) {
//       window.localStream.getTracks().forEach((track) => {
//         pc.addTrack(track, window.localStream);
//       });
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         console.log("[setupPeerConnection] sending ICE candidate to:", id);
//         socketRef.current.send(
//           JSON.stringify({
//             type: "signal",
//             toId: id,
//             data: JSON.stringify({ ice: event.candidate }),
//           })
//         );
//       }
//     };

//     pc.ontrack = (event) => {
//       console.log("[setupPeerConnection] ontrack from:", id);
//       setVideos((prev) => {
//         const exists = prev.find((v) => v.socketId === id);
//         if (exists) {
//           return prev.map((v) =>
//             v.socketId === id ? { ...v, stream: event.streams[0] } : v
//           );
//         }
//         return [...prev, { socketId: id, stream: event.streams[0] }];
//       });
//     };

//     if (isOfferer) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socketRef.current.send(
//         JSON.stringify({
//           type: "signal",
//           toId: id,
//           data: JSON.stringify({ sdp: pc.localDescription }),
//         })
//       );
//     }
//   };

//   const handleSignal = async (fromId, data) => {
//     console.log("[handleSignal] from:", fromId);
//     const parsed = typeof data === "string" ? JSON.parse(data) : data;
//     if (!connections[fromId]) setupPeerConnection(fromId, false);

//     const pc = connections[fromId];
//     if (parsed.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp));
//       if (parsed.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socketRef.current.send(
//           JSON.stringify({
//             type: "signal",
//             toId: fromId,
//             data: JSON.stringify({ sdp: pc.localDescription }),
//           })
//         );
//       }
//     } else if (parsed.ice) {
//       await pc.addIceCandidate(new RTCIceCandidate(parsed.ice));
//     }
//   };

//   // -----------------------------------
//   // 🔹 4. Cleanup + UI + Chat
//   // -----------------------------------

//   const removeVideo = (id) => {
//     console.log("[removeVideo] removing:", id);
//     setVideos((prev) => prev.filter((v) => v.socketId !== id));
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//     }
//   };

//   const addMessage = (data, sender) => {
//     console.log("[addMessage] raw:", data, "from:", sender);
//     setMessages((prev) => [...prev, { data, sender }]);
//     setNewMessages((prev) => prev + 1);
//   };

//   const sendMessage = () => {
//     if (!message.trim()) return;
//     socketRef.current.send(
//       JSON.stringify({
//         type: "chat-message",
//         data: message,
//         sender: username,
//       })
//     );
//     setMessage("");
//   };

//   const handleEndCall = () => {
//     console.log("[handleEndCall] stopping stream and redirecting...");
//     localVideoref.current?.srcObject?.getTracks().forEach((t) => t.stop());
//     window.location.href = "/";
//   };

//     let handleVideo = () => {
//         setVideo(!video);
//         // getUserMedia();
//     }
//     let handleAudio = () => {
//         setAudio(!audio)
//         // getUserMedia();
//     }
//     let handleScreen = () => {
//         setScreen(!screen);
//     }


//   // -----------------------------------
//   // 🔹 5. UI
//   // -----------------------------------


//     return (
//         <div>

//             {askForUsername === true ?

//                 <div>


//                     <h2>Enter into Lobby </h2>
//                     <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//                     <Button variant="contained" onClick={connect}>Connect</Button>


//                     <div>
//                         <video ref={localVideoref} autoPlay muted></video>
//                     </div>

//                 </div> :


//                 <div className={styles.meetVideoContainer}>

//                     {showModal ? <div className={styles.chatRoom}>

//                         <div className={styles.chatContainer}>
//                             <h1>Chat</h1>

//                             <div className={styles.chattingDisplay}>

//                                 {messages.length !== 0 ? messages.map((item, index) => {

//                                     console.log(messages)
//                                     return (
//                                         <div style={{ marginBottom: "20px" }} key={index}>
//                                             <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                                             <p>{item.data}</p>
//                                         </div>
//                                     )
//                                 }) : <p>No Messages Yet</p>}


//                             </div>

//                             <div className={styles.chattingArea}>
//                                 <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
//                                 <Button variant='contained' onClick={sendMessage}>Send</Button>
//                             </div>


//                         </div>
//                     </div> : <></>}


//                     <div className={styles.buttonContainers}>
//                         <IconButton onClick={handleVideo} style={{ color: "white" }}>
//                             {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
//                         </IconButton>
//                         <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//                             <CallEndIcon  />
//                         </IconButton>
//                         <IconButton onClick={handleAudio} style={{ color: "white" }}>
//                             {audio === true ? <MicIcon /> : <MicOffIcon />}
//                         </IconButton>

//                         {screenAvailable === true ?
//                             <IconButton onClick={handleScreen} style={{ color: "white" }}>
//                                 {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
//                             </IconButton> : <></>}

//                         <Badge badgeContent={newMessages} max={999} color='orange'>
//                             <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                                 <ChatIcon />                        </IconButton>
//                         </Badge>

//                     </div>


//                     <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

//                     <div className={styles.conferenceView}>
//                         {videos.map((video) => (
//                             <div key={video.socketId}>
//                                 <video

//                                     data-socket={video.socketId}
//                                     ref={ref => {
//                                         if (ref && video.stream) {
//                                             ref.srcObject = video.stream;
//                                         }
//                                     }}
//                                     autoPlay
//                                 >
//                                 </video>
//                             </div>

//                         ))}

//                     </div>

//                 </div>

//             }

//         </div>
//     )
// }



























// import SockJS from "sockjs-client";
// import { Client } from "@stomp/stompjs";
// import server from "../enviroment";

// import React, { useEffect, useRef, useState } from 'react'
// import { Badge, IconButton, TextField } from '@mui/material';
// import { Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff'
// import styles from "../styles/videoComponent.module.css";
// import CallEndIcon from '@mui/icons-material/CallEnd'
// import MicIcon from '@mui/icons-material/Mic'
// import MicOffIcon from '@mui/icons-material/MicOff'
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
// import ChatIcon from '@mui/icons-material/Chat'


// const server_url = server; // your Spring Boot backend
// // let stompClient = null;
// const stompClient = new Client({
//   brokerURL: undefined, // leave undefined when using SockJS
//   reconnectDelay: 5000,
//   webSocketFactory: () => new SockJS(server_url + "/ws"),
//   debug: (str) => console.log(str),
// });

// stompClient.onConnect = (frame) => {
//   console.log("Connected: ", frame);
//   stompClient.subscribe("/topic/chat", (message) => {
//     console.log("Chat:", message.body);
//   });
// };

// stompClient.activate();


// export default function VideoMeet() {
//   const localVideoref = useRef();
//   const videoRef = useRef({});
//   const [username, setUsername] = useState("");
//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [users, setUsers] = useState([]);
//   const [connected, setConnected] = useState(false);
//   const [screenShare, setScreenShare] = useState(false);

//   const connections = useRef({}); // store RTCPeerConnections

//   useEffect(() => {
//     getPermissions();
//   }, []);

//   // ====== MEDIA PERMISSIONS ======
//   const getPermissions = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       window.localStream = stream;
//       localVideoref.current.srcObject = stream;
//       setVideoAvailable(true);
//       setAudioAvailable(true);
//     } catch (err) {
//       console.error("Media permission error:", err);
//       setVideoAvailable(false);
//       setAudioAvailable(false);
//     }
//   };

//   // ====== CONNECT TO SPRING WEBSOCKET SERVER ======
//   const connectToSocketServer = () => {
//     const socket = new SockJS(`${server_url}/ws`);
//     stompClient = Stomp.over(socket);

//     stompClient.connect({}, () => {
//       console.log("Connected to STOMP server");
//       setConnected(true);

//       // Subscribe to chat topic
//       stompClient.subscribe("/topic/chat", (message) => {
//         const msg = JSON.parse(message.body);
//         setMessages((prev) => [...prev, msg]);
//       });

//       // Subscribe to signaling (WebRTC)
//       stompClient.subscribe(`/topic/signal/${username}`, (signal) => {
//         const payload = JSON.parse(signal.body);
//         gotMessageFromServer(payload.fromId, JSON.stringify(payload.data));
//       });

//       // Subscribe to user join notifications
//       stompClient.subscribe("/topic/user-joined", (msg) => {
//         const data = JSON.parse(msg.body);
//         if (!users.includes(data.username)) {
//           setUsers((prev) => [...prev, data.username]);
//         }
//       });

//       // Notify backend to join room
//       stompClient.send(
//         "/app/join-call",
//         {},
//         JSON.stringify({ username: username, room: "default" })
//       );
//     });
//   };

//   // ====== HANDLE SIGNALS ======
//   const gotMessageFromServer = (fromId, message) => {
//     // your WebRTC signaling logic here
//     console.log("Signal received:", fromId, message);
//   };

//   // ====== CHAT SEND ======
//   const sendMessage = () => {
//     if (stompClient && connected && newMessage.trim() !== "") {
//       const msgObj = { sender: username, content: newMessage };
//       stompClient.send("/app/send-chat", {}, JSON.stringify(msgObj));
//       setMessages((prev) => [...prev, msgObj]);
//       setNewMessage("");
//     }
//   };

//   // ====== TOGGLE VIDEO ======
//   const handleVideo = () => {
//     const enabled = window.localStream.getVideoTracks()[0].enabled;
//     window.localStream.getVideoTracks()[0].enabled = !enabled;
//     setVideoAvailable(!enabled);
//   };

//   // ====== TOGGLE AUDIO ======
//   const handleAudio = () => {
//     const enabled = window.localStream.getAudioTracks()[0].enabled;
//     window.localStream.getAudioTracks()[0].enabled = !enabled;
//     setAudioAvailable(!enabled);
//   };

//   // ====== SCREEN SHARE ======
//   const handleScreen = async () => {
//     if (!screenShare) {
//       const displayStream = await navigator.mediaDevices.getDisplayMedia({
//         video: true,
//       });
//       window.localStream = displayStream;
//       localVideoref.current.srcObject = displayStream;
//     } else {
//       getPermissions();
//     }
//     setScreenShare(!screenShare);
//   };

//   // ====== END CALL ======
//   const handleEndCall = () => {
//     window.localStream.getTracks().forEach((track) => track.stop());
//     stompClient?.disconnect();
//     setConnected(false);
//   };

//   // ====== UI RENDER ======
//   return (
//     <div className={styles.videoContainer}>
//       {!connected ? (
//         <div className={styles.loginBox}>
//           <TextField
//             variant="outlined"
//             placeholder="Enter Username"
//             onChange={(e) => setUsername(e.target.value)}
//             value={username}
//           />
//           <Button
//             variant="contained"
//             color="primary"
//             onClick={connectToSocketServer}
//             disabled={!username}
//           >
//             Join Call
//           </Button>
//         </div>
//       ) : (
//         <div className={styles.mainVideoPage}>
//           <div className={styles.videosSection}>
//             <video
//               ref={localVideoref}
//               autoPlay
//               muted
//               playsInline
//               className={styles.localVideo}
//             />
//           </div>

//           <div className={styles.controls}>
//             <IconButton onClick={handleVideo}>
//               {videoAvailable ? (
//                 <VideocamIcon style={{ color: "white" }} />
//               ) : (
//                 <VideocamOffIcon style={{ color: "red" }} />
//               )}
//             </IconButton>

//             <IconButton onClick={handleAudio}>
//               <i
//                 className="fa fa-microphone"
//                 style={{ color: audioAvailable ? "white" : "red" }}
//               />
//             </IconButton>

//             <IconButton onClick={handleScreen}>
//               <ScreenShareIcon style={{ color: "white" }} />
//             </IconButton>

//             <IconButton onClick={handleEndCall}>
//               <CallEndIcon style={{ color: "red" }} />
//             </IconButton>

//             <IconButton>
//               <Badge badgeContent={messages.length} color="secondary">
//                 <ChatIcon style={{ color: "white" }} />
//               </Badge>
//             </IconButton>
//           </div>

//           <div className={styles.chatBox}>
//             <div className={styles.chatMessages}>
//               {messages.map((msg, i) => (
//                 <div key={i} className={styles.chatMessage}>
//                   <b>{msg.sender}: </b>
//                   {msg.content}
//                 </div>
//               ))}
//             </div>
//             <div className={styles.chatInput}>
//               <TextField
//                 value={newMessage}
//                 onChange={(e) => setNewMessage(e.target.value)}
//                 placeholder="Type a message..."
//                 variant="outlined"
//                 size="small"
//               />
//               <Button variant="contained" onClick={sendMessage}>
//                 Send
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }














// import React, { useEffect, useRef, useState } from 'react'
// import SockJS from "sockjs-client";
// import { Badge, IconButton, TextField } from '@mui/material';
// import { Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff'
// import styles from "../styles/videoComponent.module.css";
// import CallEndIcon from '@mui/icons-material/CallEnd'
// import MicIcon from '@mui/icons-material/Mic'
// import MicOffIcon from '@mui/icons-material/MicOff'
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
// import ChatIcon from '@mui/icons-material/Chat'
// import server from '../enviroment';
// import SockJS from 'sockjs-client';
// import { useNavigate } from 'react-router-dom';

// const server_url = server;

// var connections = {};

// const peerConfigConnections = {
//   "iceServers": [
//     { "urls": "stun:stun.l.google.com:19302" }
//   ]
// }

// export default function VideoMeetComponent() {

//   const router = useNavigate();

//   var socketRef = useRef();
//   let socketIdRef = useRef();

//   let localVideoref = useRef();

//   let [videoAvailable, setVideoAvailable] = useState(true);

//   let [audioAvailable, setAudioAvailable] = useState(true);

//   let [video, setVideo] = useState([]);

//   let [audio, setAudio] = useState();

//   let [screen, setScreen] = useState();

//   let [showModal, setModal] = useState(true);

//   let [screenAvailable, setScreenAvailable] = useState();

//   let [messages, setMessages] = useState([])

//   let [message, setMessage] = useState("");

//   let [newMessages, setNewMessages] = useState(3);

//   let [askForUsername, setAskForUsername] = useState(true);

//   let [username, setUsername] = useState("");

//   const videoRef = useRef([])

//   let [videos, setVideos] = useState([])

//   // TODO
//   // if(isChrome() === false) {


//   // }

//   useEffect(() => {
//     console.log("HELLO")
//     getPermissions();

//   }, [])

//   let getDislayMedia = () => {
//     if (!screen) {
//       if (navigator.mediaDevices.getDisplayMedia) {
//         navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
//           .then(getDislayMediaSuccess)
//           .then((stream) => { })
//           .catch((e) => console.log(e))
//       }
//     }
//   }

//   const getPermissions = async () => {
//     try {
//       const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
//       if (videoPermission) {
//         setVideoAvailable(true);
//         console.log('Video permission granted');
//       } else {
//         setVideoAvailable(false);
//         console.log('Video permission denied');
//       }

//       const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
//       if (audioPermission) {
//         setAudioAvailable(true);
//         console.log('Audio permission granted');
//       } else {
//         setAudioAvailable(false);
//         console.log('Audio permission denied');
//       }

//       if (navigator.mediaDevices.getDisplayMedia) {
//         setScreenAvailable(true);
//       } else {
//         setScreenAvailable(false);
//       }

//       if (videoAvailable || audioAvailable) {
//         const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
//         if (userMediaStream) {
//           window.localStream = userMediaStream;
//           if (localVideoref.current) {
//             localVideoref.current.srcObject = userMediaStream;
//           }
//         }
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   useEffect(() => {
//     if (video !== undefined && audio !== undefined) {
//       getUserMedia();
//       console.log("SET STATE HAS ", video, audio);

//     }


//   }, [video, audio])
//   let getMedia = () => {
//     setVideo(videoAvailable);
//     setAudio(audioAvailable);
//     connectToSocketServer();

//   }




//   let getUserMediaSuccess = (stream) => {
//     try {
//       window.localStream.getTracks().forEach(track => track.stop())
//     } catch (e) { console.log(e) }

//     window.localStream = stream
//     localVideoref.current.srcObject = stream

//     for (let id in connections) {
//       if (id === socketIdRef.current) continue

//       connections[id].addStream(window.localStream)

//       connections[id].createOffer().then((description) => {
//         console.log(description)
//         connections[id].setLocalDescription(description)
//           .then(() => {
//             socketRef.current.send(JSON.stringify({
//               type: "signal",
//               toId: id,
//               data: { sdp: connections[id].localDescription }
//             }));
//           })
//           .catch(e => console.log(e))
//       })
//     }

//     stream.getTracks().forEach(track => track.onended = () => {
//       setVideo(false);
//       setAudio(false);

//       try {
//         let tracks = localVideoref.current.srcObject.getTracks()
//         tracks.forEach(track => track.stop())
//       } catch (e) { console.log(e) }

//       let blackSilence = (...args) => new MediaStream([black(...args), silence()])
//       window.localStream = blackSilence()
//       localVideoref.current.srcObject = window.localStream

//       for (let id in connections) {
//         connections[id].addStream(window.localStream)

//         connections[id].createOffer().then((description) => {
//           connections[id].setLocalDescription(description)
//             .then(() => {
//               socketRef.current.send(JSON.stringify({
//                 type: "signal",
//                 toId: id,
//                 data: { sdp: connections[id].localDescription }
//               }));
//             })
//             .catch(e => console.log(e))
//         })
//       }
//     })
//   }

//   let getUserMedia = () => {
//     if ((video && videoAvailable) || (audio && audioAvailable)) {
//       navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
//         .then(getUserMediaSuccess)
//         .then((stream) => { })
//         .catch((e) => console.log(e))
//     } else {
//       try {
//         let tracks = localVideoref.current.srcObject.getTracks()
//         tracks.forEach(track => track.stop())
//       } catch (e) { }
//     }
//   }





//   let getDislayMediaSuccess = (stream) => {
//     console.log("HERE")
//     try {
//       window.localStream.getTracks().forEach(track => track.stop())
//     } catch (e) { console.log(e) }

//     window.localStream = stream
//     localVideoref.current.srcObject = stream

//     for (let id in connections) {
//       if (id === socketIdRef.current) continue

//       connections[id].addStream(window.localStream)

//       connections[id].createOffer().then((description) => {
//         connections[id].setLocalDescription(description)
//           .then(() => {
//             socketRef.current.send(JSON.stringify({
//               type: "signal",
//               toId: id,
//               data: { sdp: connections[id].localDescription }
//             }));
//           })
//           .catch(e => console.log(e))
//       })
//     }

//     stream.getTracks().forEach(track => track.onended = () => {
//       setScreen(false)

//       try {
//         let tracks = localVideoref.current.srcObject.getTracks()
//         tracks.forEach(track => track.stop())
//       } catch (e) { console.log(e) }

//       let blackSilence = (...args) => new MediaStream([black(...args), silence()])
//       window.localStream = blackSilence()
//       localVideoref.current.srcObject = window.localStream

//       getUserMedia()

//     })
//   }

//   // let gotMessageFromServer = (fromId, message) => {
//   //   var signal = JSON.parse(message)

//   //   if (fromId !== socketIdRef.current) {
//   //     if (signal.sdp) {
//   //       connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
//   //         if (signal.sdp.type === 'offer') {
//   //           connections[fromId].createAnswer().then((description) => {
//   //             connections[fromId].setLocalDescription(description).then(() => {
//   //               socketRef.current.send(JSON.stringify({
//   //                 type: "signal",
//   //                 toId: fromId,
//   //                 data: { sdp: connections[fromId].localDescription }
//   //               }));
//   //             }).catch(e => console.log(e))
//   //           }).catch(e => console.log(e))
//   //         }
//   //       }).catch(e => console.log(e))
//   //     }

//   //     if (signal.ice) {
//   //       connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
//   //     }
//   //   }
//   // }


//   let gotMessageFromServer = (fromId, message) => {
//     const signal = JSON.parse(message);

//     // ignore messages from self
//     if (fromId === socketIdRef.current) return;

//     // SDP
//     if (signal.sdp) {
//       connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
//         .then(() => {
//           if (signal.sdp.type === 'offer') {
//             // create answer
//             connections[fromId].createAnswer().then((description) => {
//               return connections[fromId].setLocalDescription(description);
//             }).then(() => {
//               socketRef.current.send(JSON.stringify({
//                 type: "signal",
//                 toId: fromId,
//                 data: { sdp: connections[fromId].localDescription }
//               }));
//             }).catch(e => console.error("Answer error:", e));
//           }
//         }).catch(e => console.error("setRemoteDescription error:", e));
//     }

//     // ICE
//     if (signal.ice) {
//       connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
//         .catch(e => console.error("addIceCandidate error:", e));
//     }
//   };



//   // const handleUserJoined = (id, clients) => {
//   //   clients.forEach((socketListId) => {
//   //     if (connections[socketListId]) return;

//   //     connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

//   //     connections[socketListId].onicecandidate = function (event) {
//   //       if (event.candidate != null) {
//   //         socketRef.current.send(JSON.stringify({
//   //           type: "signal",
//   //           toId: socketListId,
//   //           data: { ice: event.candidate }
//   //         }));
//   //       }
//   //     };

//   //     connections[socketListId].onaddstream = (event) => {
//   //       let videoExists = videoRef.current.find(v => v.socketId === socketListId);
//   //       if (videoExists) return;

//   //       const newVideo = {
//   //         socketId: socketListId,
//   //         stream: event.stream,
//   //         autoplay: true,
//   //         playsinline: true
//   //       };

//   //       setVideos(videos => {
//   //         const updated = [...videos, newVideo];
//   //         videoRef.current = updated;
//   //         return updated;
//   //       });
//   //     };

//   //     if (window.localStream) {
//   //       connections[socketListId].addStream(window.localStream);
//   //     }
//   //   });

//   //   if (id === socketIdRef.current) {
//   //     for (let id2 in connections) {
//   //       if (id2 === socketIdRef.current) continue;
//   //       connections[id2].createOffer().then((description) => {
//   //         connections[id2].setLocalDescription(description).then(() => {
//   //           socketRef.current.send(JSON.stringify({
//   //             type: "signal",
//   //             toId: id2,
//   //             data: { sdp: connections[id2].localDescription }
//   //           }));
//   //         });
//   //       });
//   //     }
//   //   }
//   // };


//   const handleUserJoined = (joinedId, clients) => {
//     console.log("handleUserJoined:", joinedId, clients, "myId:", socketIdRef.current);

//     // if server provided full clients list, iterate them
//     clients.forEach((remoteId) => {
//       if (remoteId === socketIdRef.current) return; // don't create for self
//       if (connections[remoteId]) return; // already created

//       const pc = new RTCPeerConnection(peerConfigConnections);
//       connections[remoteId] = pc;

//       // send ice
//       pc.onicecandidate = (event) => {
//         if (event.candidate) {
//           socketRef.current.send(JSON.stringify({
//             type: "signal",
//             toId: remoteId,
//             data: { ice: event.candidate }
//           }));
//         }
//       };

//       // modern: ontrack (preferred) — handle remote streams
//       pc.ontrack = (event) => {
//         console.log("ontrack from", remoteId, event.streams);
//         const stream = event.streams && event.streams[0] ? event.streams[0] : event.stream;
//         setVideos(prev => {
//           if (prev.find(v => v.socketId === remoteId)) return prev;
//           const updated = [...prev, { socketId: remoteId, stream }];
//           videoRef.current = updated;
//           return updated;
//         });
//       };

//       // legacy (if you still rely on addStream)
//       pc.onaddstream = (event) => {
//         console.log("onaddstream from", remoteId);
//         const stream = event.stream;
//         setVideos(prev => {
//           if (prev.find(v => v.socketId === remoteId)) return prev;
//           const updated = [...prev, { socketId: remoteId, stream }];
//           videoRef.current = updated;
//           return updated;
//         });
//       };

//       // attach our local tracks
//       if (window.localStream) {
//         // prefer addTrack + track-based API
//         try {
//           window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//         } catch (e) {
//           // fallback to addStream if browser requires
//           try { pc.addStream(window.localStream); } catch (err) { console.warn(err); }
//         }
//       }

//     });

//     // If server indicates a new user joined (joinedId) and I'm already in room,
//     // then all existing users should createOffer to the newly joined user.
//     if (joinedId && joinedId !== socketIdRef.current) {
//       // this client is existing participant -> create offer to the newcomer
//       const pcForNew = connections[joinedId];
//       if (pcForNew) {
//         pcForNew.createOffer().then(desc => pcForNew.setLocalDescription(desc))
//           .then(() => {
//             socketRef.current.send(JSON.stringify({
//               type: "signal",
//               toId: joinedId,
//               data: { sdp: pcForNew.localDescription }
//             }));
//           }).catch(e => console.error("createOffer error:", e));
//       }
//     }
//   };





//   // let connectToSocketServer = () => {
//   //   // connect SockJS to your Spring Boot endpoint
//   //   const socket = new SockJS(`${server_url}/ws`);
//   //   socketRef.current = socket;

//   //   socket.onopen = () => {
//   //     console.log("✅ SockJS connected");
//   //     socket.send(JSON.stringify({
//   //       type: "join-call",
//   //       room: window.location.href,
//   //       username: username
//   //     }));
//   //   };


//   //   socket.onmessage = (event) => {
//   //     const msg = JSON.parse(event.data);
//   //     console.log("SOCK MSG:", msg);

//   //     switch (msg.type) {
//   //       case "init":
//   //         socketIdRef.current = msg.id;
//   //         console.log("🆔 Assigned socketId:", msg.id);
//   //         break;

//   //       case "signal":
//   //         gotMessageFromServer(msg.fromId, JSON.stringify(msg.data));
//   //         break;

//   //       case "user-joined":
//   //         handleUserJoined(msg.userId, msg.clients);
//   //         break;

//   //       case "chat-message":
//   //         addMessage(msg.data, msg.sender, msg.socketIdSender);
//   //         break;

//   //       case "user-left":
//   //         setVideos(videos => videos.filter(v => v.socketId !== msg.id));
//   //         break;

//   //       default:
//   //         console.log("Unknown message:", msg);
//   //     }
//   //   };


//   //   socket.onclose = () => {
//   //     console.log("❌ SockJS connection closed");
//   //   };
//   // };

//   const connectToSocketServer = () => {
//     const socket = new WebSocket(`${server_url.replace("http", "ws")}/ws`);
//     socketRef.current = socket;

//     socket.onopen = () => {
//       console.log("✅ Connected to signaling server");
//       socket.send(JSON.stringify({
//         type: "join",
//         username: username || "Guest",
//         room: "my-room"
//       }));
//     };

//     socket.onmessage = async (event) => {
//       const data = JSON.parse(event.data);
//       switch (data.type) {
//         case "user-joined":
//           console.log("👤 User joined", data);
//           handleUserJoined(data);
//           break;
//         case "signal":
//           console.log("📡 Signal from", data.from);
//           await handleSignal(data);
//           break;
//         case "chat":
//           addMessage(data.sender, data.message);
//           break;
//         case "user-left":
//           handleUserLeft(data);
//           break;
//         default:
//           console.warn("⚠️ Unknown message type:", data.type);
//       }
//     };

//     socket.onclose = () => console.log("❌ Disconnected from server");
//   };


//   let silence = () => {
//     let ctx = new AudioContext()
//     let oscillator = ctx.createOscillator()
//     let dst = oscillator.connect(ctx.createMediaStreamDestination())
//     oscillator.start()
//     ctx.resume()
//     return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
//   }
//   let black = ({ width = 640, height = 480 } = {}) => {
//     let canvas = Object.assign(document.createElement("canvas"), { width, height })
//     canvas.getContext('2d').fillRect(0, 0, width, height)
//     let stream = canvas.captureStream()
//     return Object.assign(stream.getVideoTracks()[0], { enabled: false })
//   }

//   let handleVideo = () => {
//     setVideo(!video);
//     // getUserMedia();
//   }
//   let handleAudio = () => {
//     setAudio(!audio)
//     // getUserMedia();
//   }

//   useEffect(() => {
//     if (screen !== undefined) {
//       getDislayMedia();
//     }
//   }, [screen])
//   let handleScreen = () => {
//     setScreen(!screen);
//   }

//   let handleEndCall = () => {
//     try {
//       let tracks = localVideoref.current.srcObject.getTracks()
//       tracks.forEach(track => track.stop())
//     } catch (e) { }
//     router.navigae("/home")
//   }

//   let openChat = () => {
//     setModal(true);
//     setNewMessages(0);
//   }
//   let closeChat = () => {
//     setModal(false);
//   }
//   let handleMessage = (e) => {
//     setMessage(e.target.value);
//   }

//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages((prevMessages) => [
//       ...prevMessages,
//       { sender: sender, data: data }
//     ]);
//     if (socketIdSender !== socketIdRef.current) {
//       setNewMessages((prevNewMessages) => prevNewMessages + 1);
//     }
//   };



//   let sendMessage = () => {
//     console.log(socketRef.current);
//     socketRef.current.send(JSON.stringify({
//       type: "chat-message",
//       data: message,
//       sender: username
//     }));
//     setMessage("");

//     // this.setState({ message: "", sender: username })
//   }


//   let connect = () => {
//     setAskForUsername(false);
//     getMedia();
//   }

//   useEffect(() => {
//     return () => {
//       console.log("🧹 Cleaning up socket & media...");
//       if (socketRef.current) socketRef.current.close();
//       if (window.localStream) {
//         window.localStream.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);



//   return (
//     <div>

//       {askForUsername === true ?

//         <div>


//           <h2>Enter into Lobby </h2>
//           <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={connect}>Connect</Button>


//           <div>
//             <video ref={localVideoref} autoPlay muted></video>
//           </div>

//         </div> :


//         <div className={styles.meetVideoContainer}>

//           {showModal ? <div className={styles.chatRoom}>

//             <div className={styles.chatContainer}>
//               <h1>Chat</h1>

//               <div className={styles.chattingDisplay}>

//                 {messages.length !== 0 ? messages.map((item, index) => {

//                   console.log(messages)
//                   return (
//                     <div style={{ marginBottom: "20px" }} key={index}>
//                       <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                       <p>{item.data}</p>
//                     </div>
//                   )
//                 }) : <p>No Messages Yet</p>}


//               </div>

//               <div className={styles.chattingArea}>
//                 <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
//                 <Button variant='contained' onClick={sendMessage}>Send</Button>
//               </div>


//             </div>
//           </div> : <></>}


//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideo} style={{ color: "white" }}>
//               {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
//             </IconButton>
//             <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//               <CallEndIcon />
//             </IconButton>
//             <IconButton onClick={handleAudio} style={{ color: "white" }}>
//               {audio === true ? <MicIcon /> : <MicOffIcon />}
//             </IconButton>

//             {screenAvailable === true ?
//               <IconButton onClick={handleScreen} style={{ color: "white" }}>
//                 {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
//               </IconButton> : <></>}

//             <Badge badgeContent={newMessages} max={999} color='secondary'>
//               <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                 <ChatIcon />                        </IconButton>
//             </Badge>

//           </div>


//           <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

//           <div className={styles.conferenceView}>
//             {videos.map((video) => (
//               <div key={video.socketId}>
//                 <video

//                   data-socket={video.socketId}
//                   ref={ref => {
//                     if (ref && video.stream) {
//                       ref.srcObject = video.stream;
//                     }
//                   }}
//                   autoPlay
//                 >
//                 </video>
//               </div>

//             ))}

//           </div>

//         </div>

//       }

//     </div>
//   )
// }










// import React, { useState, useRef, useEffect } from "react";

// const server_url = server; // <-- change to your deployed backend URL

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// export default function VideoMeetComponent() {
//   const localVideoref = useRef(null);
//   const videoRef = useRef({});
//   const socketRef = useRef(null);

//   const [connections, setConnections] = useState({});
//   const [username, setUsername] = useState("Guest-" + Math.floor(Math.random() * 1000));
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);

//   // 📞 get camera/mic permission
//   useEffect(() => {
//     getUserMedia();
//     connectToSocketServer();
//     return () => {
//       if (socketRef.current) socketRef.current.close();
//     };
//     // eslint-disable-next-line
//   }, []);

//   const safeSend = (obj) => {
//     if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//       socketRef.current.send(JSON.stringify(obj));
//     } else {
//       console.warn("⏳ WebSocket not ready, delaying send...");
//       setTimeout(() => safeSend(obj), 300); // retry in 300ms
//     }
//   };


//   const getUserMedia = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       window.localStream = stream;
//       if (localVideoref.current) localVideoref.current.srcObject = stream;
//     } catch (err) {
//       console.error("Media error:", err);
//     }
//   };

//   // 🛰️ Connect to signaling server
//   const connectToSocketServer = () => {
//     const wsUrl = server_url + "/ws";
//     const socket = new SockJS(wsUrl);
//     socketRef.current = socket;

//     socket.onopen = () => {
//       console.log("✅ Connected to signaling server");
//       setIsConnected(true);
//       socket.send(JSON.stringify({ type: "join", username, room: "main-room" }));
//     };

//     socket.onmessage = async (event) => {
//       const data = JSON.parse(event.data);
//       switch (data.type) {
//         case "user-joined":
//           handleUserJoined(data);
//           break;
//         case "signal":
//           await handleSignal(data);
//           break;
//         case "chat":
//           addMessage(data.sender, data.message);
//           break;
//         case "user-left":
//           handleUserLeft(data);
//           break;
//         default:
//           console.log("⚠️ Unknown:", data);
//       }
//     };

//     setInterval(() => {
//       if (socketRef.current?.readyState === WebSocket.OPEN) {
//         socketRef.current.send(JSON.stringify({ type: "ping" }));
//       }
//     }, 30000);


//     socket.onclose = () => {
//       console.log("❌ Disconnected from signaling server");
//       setIsConnected(false);
//     };
//   };

//   // 👤 when a user joins, create peer connection
//   const handleUserJoined = async (data) => {
//     const clients = Array.from(data.clients).filter((id) => id !== socketRef.current.id);
//     console.log("👥 Users in room:", clients);

//     for (let id of clients) {
//       if (!connections[id]) {
//         await createOffer(id);
//       }
//     }
//   };

//   // 📡 handle incoming offer/answer/ICE
//   const handleSignal = async (data) => {
//     const fromId = data.from;
//     const signalData = data.data;

//     let pc = connections[fromId];
//     if (!pc) {
//       pc = await createPeerConnection(fromId);
//     }

//     if (signalData.type === "offer") {
//       await pc.setRemoteDescription(new RTCSessionDescription(signalData));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socketRef.current.send(JSON.stringify({ type: "signal", to: fromId, data: answer }));
//     } else if (signalData.type === "answer") {
//       await pc.setRemoteDescription(new RTCSessionDescription(signalData));
//     } else if (signalData.candidate) {
//       try {
//         await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
//       } catch (err) {
//         console.error("ICE error:", err);
//       }
//     }
//   };

//   // 🧩 create new peer connection
//   const createPeerConnection = async (id) => {
//     const pc = new RTCPeerConnection(peerConfigConnections);
//     const stream = window.localStream;
//     stream.getTracks().forEach((track) => pc.addTrack(track, stream));

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current.send(
//           JSON.stringify({ type: "signal", to: id, data: { candidate: event.candidate } })
//         );
//       }
//     };

//     pc.ontrack = (event) => {
//       if (!videoRef.current[id]) {
//         const videoEl = document.createElement("video");
//         videoEl.srcObject = event.streams[0];
//         videoEl.autoplay = true;
//         videoEl.playsInline = true;
//         videoEl.className = "remote-video";
//         document.getElementById("remote-videos").appendChild(videoEl);
//         videoRef.current[id] = videoEl;
//       }
//     };

//     setConnections((prev) => ({ ...prev, [id]: pc }));
//     return pc;
//   };

//   // 🎥 create offer to another peer
//   const createOffer = async (id) => {
//     const pc = await createPeerConnection(id);
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     socketRef.current.send(JSON.stringify({ type: "signal", to: id, data: offer }));
//   };

//   // 🚪 user left
//   const handleUserLeft = (data) => {
//     const id = data.id;
//     if (videoRef.current[id]) {
//       videoRef.current[id].remove();
//       delete videoRef.current[id];
//     }
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//     }
//   };

//   // 💬 Chat system
//   const addMessage = (sender, msg) => {
//     setMessages((prev) => [...prev, { sender, msg }]);
//   };

//   const sendMessage = () => {
//     if (message.trim() && socketRef.current) {
//       socketRef.current.send(JSON.stringify({ type: "chat", message }));
//       addMessage(username, message);
//       setMessage("");
//     }
//   };

//   // 🎚️ toggle video/audio
//   const handleVideo = () => {
//     setVideo((prev) => !prev);
//     window.localStream.getVideoTracks().forEach((track) => (track.enabled = !video));
//   };

//   const handleAudio = () => {
//     setAudio((prev) => !prev);
//     window.localStream.getAudioTracks().forEach((track) => (track.enabled = !audio));
//   };

//   return (
//     <div className="videomeet-container">
//       <div className="local-video-wrapper">
//         <video
//           className="local-video"
//           ref={localVideoref}
//           autoPlay
//           muted
//           playsInline
//         ></video>
//       </div>

//       <div id="remote-videos" className="remote-videos"></div>

//       <div className="controls">
//         <button onClick={handleVideo}>{video ? "Turn Video Off" : "Turn Video On"}</button>
//         <button onClick={handleAudio}>{audio ? "Mute" : "Unmute"}</button>
//       </div>

//       <div className="chat-section">
//         <div className="chat-messages">
//           {messages.map((m, i) => (
//             <div key={i}>
//               <b>{m.sender}:</b> {m.msg}
//             </div>
//           ))}
//         </div>
//         <div className="chat-input">
//           <input
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             placeholder="Type message..."
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       </div>
//     </div>
//   );
// }











// const server_url = server; // your backend URL

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// export default function VideoMeetComponent() {
//   const localVideoref = useRef(null);
//   const videoRef = useRef({});
//   const socketRef = useRef(null);

//   const [connections, setConnections] = useState({});
//   const [pendingCandidates, setPendingCandidates] = useState({});
//   const [username] = useState("Guest-" + Math.floor(Math.random() * 1000));
//   const [message, setMessage] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [isConnected, setIsConnected] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);



//   // 📞 Initialize
//   useEffect(() => {
//     getUserMedia();
//     connectToSocketServer();
//     return () => {
//       if (socketRef.current) socketRef.current.close();
//     };
//   }, []);

//   const safeSend = (obj) => {
//     if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
//       socketRef.current.send(JSON.stringify(obj));
//     } else {
//       console.warn("⏳ WebSocket not ready, retrying...");
//       setTimeout(() => safeSend(obj), 300);
//     }
//   };

//   // 🧍 Get local camera/mic
//   const getUserMedia = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       window.localStream = stream;
//       if (localVideoref.current) localVideoref.current.srcObject = stream;
//     } catch (err) {
//       console.error("Media error:", err);
//     }
//   };

//   // 🛰️ Connect signaling
//   const connectToSocketServer = () => {
//     const socket = new SockJS(server_url + "/ws");
//     socketRef.current = socket;

//     socket.onopen = () => {
//       console.log("✅ Connected to signaling server");
//       setIsConnected(true);
//       safeSend({ type: "join", username, room: "main-room" });
//     };

//     socket.onmessage = async (event) => {
//       const data = JSON.parse(event.data);
//       switch (data.type) {
//         case "user-joined":
//           handleUserJoined(data);
//           break;
//         case "signal":
//           await handleSignal(data);
//           break;
//         case "chat":
//           addMessage(data.sender, data.message);
//           break;
//         case "user-left":
//           handleUserLeft(data);
//           break;
//         default:
//           console.log("⚠️ Unknown:", data);
//       }
//     };

//     socket.onclose = () => {
//       console.log("❌ Disconnected from signaling server");
//       setIsConnected(false);
//     };
//   };
  
//   // 👥 When a new user joins
//   const handleUserJoined = async (data) => {
//     const clients = Array.from(data.clients).filter((id) => id !== socketRef.current.id);
//     console.log("👥 Users in room:", clients);
//     if (!isInitiator) return; // skip if we are not initiator


//     if (clients.length > 0) {
//       console.log("📡 Creating offers to existing clients:", clients);
//       for (let id of clients) {
//         if (!connections[id]) {
//           await createOffer(id);
//         }
//       }
//     } else {
//       console.log("🕓 First user in room, waiting for others...");
//     }
//   };

//   // 📡 Handle signaling data
//   const handleSignal = async (data) => {
//     const fromId = data.from;
//     const signalData = data.data;
//     let pc = connections[fromId];

//     if (!pc) {
//       pc = await createPeerConnection(fromId);
//     }

//     if (signalData.type === "offer") {
//       // set remote offer, create and send answer
//       await pc.setRemoteDescription(new RTCSessionDescription(signalData));
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       safeSend({ type: "signal", to: fromId, data: answer });

//       // add queued candidates if any
//       flushPendingCandidates(fromId, pc);
//     } else if (signalData.type === "answer") {
//       // got answer to our offer
//       await pc.setRemoteDescription(new RTCSessionDescription(signalData));

//       flushPendingCandidates(fromId, pc);
//     } else if (signalData.candidate) {
//       // got ICE candidate before remoteDescription is set?
//       if (pc.remoteDescription) {
//         try {
//           await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
//         } catch (err) {
//           console.error("ICE add error:", err);
//         }
//       } else {
//         setPendingCandidates((prev) => {
//           const updated = { ...prev };
//           if (!updated[fromId]) updated[fromId] = [];
//           updated[fromId].push(signalData.candidate);
//           return updated;
//         });
//       }
//     }
//   };
//   let isInitiator = false;

//   function handleUserList(clients) {
//     if (clients.length > 0) {
//       isInitiator = true; // only true for new joiners
//       for (let id of clients) {
//         if (!connections[id]) {
//           createOffer(id);
//         }
//       }
//     }
//   }


//   // 🚿 Flush queued ICE candidates
//   const flushPendingCandidates = async (id, pc) => {
//     if (pendingCandidates[id]) {
//       for (const c of pendingCandidates[id]) {
//         try {
//           await pc.addIceCandidate(new RTCIceCandidate(c));
//         } catch (e) {
//           console.warn("Skipping ICE add:", e);
//         }
//       }
//       setPendingCandidates((prev) => {
//         const updated = { ...prev };
//         delete updated[id];
//         return updated;
//       });
//     }
//   };

//   // 🧩 Peer connection creation
//   const createPeerConnection = async (id) => {
//     const pc = new RTCPeerConnection(peerConfigConnections);
//     const stream = window.localStream;
//     stream.getTracks().forEach((track) => pc.addTrack(track, stream));

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         safeSend({ type: "signal", to: id, data: { candidate: event.candidate } });
//       }
//     };

//     pc.ontrack = (event) => {
//       if (!videoRef.current[id]) {
//         const videoEl = document.createElement("video");
//         videoEl.srcObject = event.streams[0];
//         videoEl.autoplay = true;
//         videoEl.playsInline = true;
//         videoEl.className = "remote-video";
//         document.getElementById("remote-videos").appendChild(videoEl);
//         videoRef.current[id] = videoEl;
//       }
//     };

//     setConnections((prev) => ({ ...prev, [id]: pc }));
//     return pc;
//   };

//   // 🎥 Offer creation
//   const createOffer = async (id) => {
//     const pc = await createPeerConnection(id);
//     const offer = await pc.createOffer();
//     await pc.setLocalDescription(offer);
//     safeSend({ type: "signal", to: id, data: offer });
//   };

//   // 🚪 User left
//   const handleUserLeft = (data) => {
//     const id = data.id;
//     if (videoRef.current[id]) {
//       videoRef.current[id].remove();
//       delete videoRef.current[id];
//     }
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//       setConnections({ ...connections });
//     }
//   };

//   // 💬 Chat
//   const addMessage = (sender, msg) => {
//     setMessages((prev) => [...prev, { sender, msg }]);
//   };

//   const sendMessage = () => {
//     if (message.trim()) {
//       safeSend({ type: "chat", message });
//       addMessage(username, message);
//       setMessage("");
//     }
//   };

//   // 🎚️ Controls
//   const handleVideo = () => {
//     setVideo((prev) => !prev);
//     window.localStream.getVideoTracks().forEach((track) => (track.enabled = !video));
//   };

//   const handleAudio = () => {
//     setAudio((prev) => !prev);
//     window.localStream.getAudioTracks().forEach((track) => (track.enabled = !audio));
//   };

//   return (
//     <div className="videomeet-container">
//       <div className="local-video-wrapper">
//         <video
//           className="local-video"
//           ref={localVideoref}
//           autoPlay
//           muted
//           playsInline
//         ></video>
//       </div>

//       <div id="remote-videos" className="remote-videos"></div>

//       <div className="controls">
//         <button onClick={handleVideo}>{video ? "Turn Video Off" : "Turn Video On"}</button>
//         <button onClick={handleAudio}>{audio ? "Mute" : "Unmute"}</button>
//       </div>

//       <div className="chat-section">
//         <div className="chat-messages">
//           {messages.map((m, i) => (
//             <div key={i}>
//               <b>{m.sender}:</b> {m.msg}
//             </div>
//           ))}
//         </div>
//         <div className="chat-input">
//           <input
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             placeholder="Type message..."
//           />
//           <button onClick={sendMessage}>Send</button>
//         </div>
//       </div>
//     </div>
//   );
// }












// VideoMeetComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import { useNavigate } from 'react-router-dom';
import server from '../enviroment';

const server_url = server; // "https://vchat-rp52.onrender.com"

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export default function VideoMeetComponent() {
  const router = useNavigate();

  const socketRef = useRef(null);         // SockJS socket
  const socketIdRef = useRef(null);       // our backend session id (assigned by server broadcast matching username)
  const connectionsRef = useRef({});      // map of peerId -> RTCPeerConnection
  const pendingCandidatesRef = useRef({});// map peerId -> [candidate,...] queued before remoteDesc set
  const videoRef = useRef([]);            // store remote video objects for rendering mapping
  const localVideoref = useRef(null);

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);

  const [video, setVideo] = useState(false);      // whether user enabled camera (UI toggles)
  const [audio, setAudio] = useState(false);      // whether user enabled mic
  const [screen, setScreen] = useState(false);
  const [showModal, setModal] = useState(true);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);

  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("Guest-" + Math.floor(Math.random() * 10000));

  const [videos, setVideos] = useState([]); // [{socketId, stream}]

  // safeSend: retries until socket open
  const safeSend = (obj) => {
    const s = socketRef.current;
    try {
      if (s && s.readyState === 1) {
        s.send(JSON.stringify(obj));
      } else {
        // retry after small delay
        setTimeout(() => safeSend(obj), 250);
      }
    } catch (e) {
      console.warn("safeSend error:", e);
    }
  };

  // get permissions and local stream
  const getPermissions = async () => {
    try {
      // check availability
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      // attempt to acquire default media for preview but do not force if denied
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.localStream = stream;
      if (localVideoref.current) localVideoref.current.srcObject = stream;
      // default toggles on
      setVideo(true);
      setAudio(true);
    } catch (e) {
      console.warn("Media permission error:", e);
      // leave localStream undefined if denied, will request later when user presses connect
    }
  };

  // mount: request permissions and set cleanup
  useEffect(() => {
    getPermissions();
    // cleanup on unmount
    return () => {
      // close socket
      try { socketRef.current && socketRef.current.close(); } catch (e) {}
      // stop local tracks
      try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      // close peer connections
      try {
        const conns = connectionsRef.current;
        Object.keys(conns).forEach(k => {
          try { conns[k].close(); } catch (e) {}
        });
      } catch (e) {}
    };
  }, []);

  // helper: create RTCPeerConnection for a remote id
  const createPeerConnection = (remoteId) => {
    if (connectionsRef.current[remoteId]) return connectionsRef.current[remoteId];

    const pc = new RTCPeerConnection(peerConfigConnections);

    // add local tracks if available
    if (window.localStream) {
      try {
        window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
      } catch (e) {
        // fallback addStream (older browsers)
        try { pc.addStream(window.localStream); } catch (err) { console.warn(err); }
      }
    }

    // ICE -> send candidate to remote
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        safeSend({
          type: "signal",
          to: remoteId,
          data: { candidate: event.candidate }
        });
      }
    };

    // when remote track arrives, add a video element (or update existing)
    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) || event.stream;
      setVideos(prev => {
        if (prev.find(v => v.socketId === remoteId)) return prev;
        const updated = [...prev, { socketId: remoteId, stream }];
        videoRef.current = updated; // keep ref in sync
        return updated;
      });
    };

    // legacy onaddstream (still helpful in some cases)
    pc.onaddstream = (event) => {
      const stream = event.stream;
      setVideos(prev => {
        if (prev.find(v => v.socketId === remoteId)) return prev;
        const updated = [...prev, { socketId: remoteId, stream }];
        videoRef.current = updated;
        return updated;
      });
    };

    connectionsRef.current[remoteId] = pc;
    return pc;
  };

  // handle queued ICE candidates (flush when remoteDescription present)
  const flushPendingCandidates = async (remoteId) => {
    const pc = connectionsRef.current[remoteId];
    if (!pc) return;
    const pending = pendingCandidatesRef.current[remoteId];
    if (pending && pending.length) {
      for (const cand of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("flush addIceCandidate error:", e);
        }
      }
      pendingCandidatesRef.current[remoteId] = [];
    }
  };

  // create offer and send to remoteId
  const createOffer = async (remoteId) => {
    try {
      const pc = createPeerConnection(remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      safeSend({
        type: "signal",
        to: remoteId,
        data: offer
      });
    } catch (e) {
      console.error("createOffer error:", e);
    }
  };

  // create answer in response to an offer
  const createAnswerForOffer = async (remoteId, offerSDP) => {
    try {
      const pc = createPeerConnection(remoteId);
      await pc.setRemoteDescription(new RTCSessionDescription(offerSDP));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      safeSend({
        type: "signal",
        to: remoteId,
        data: answer
      });
      // flush candidates queued for this remote
      await flushPendingCandidates(remoteId);
    } catch (e) {
      console.error("createAnswer error:", e);
    }
  };

  // handle incoming signal message from server: { type: 'signal', from: id, data: {...} }
  const handleSignal = async (fromId, data) => {
    try {
      // data might be an SDP (offer/answer) or candidate
      if (data.type === 'offer') {
        // received an offer => respond with answer
        await createAnswerForOffer(fromId, data);
      } else if (data.type === 'answer') {
        // received answer to our offer
        const pc = createPeerConnection(fromId);
        // setRemoteDescription only when in correct state; setRemoteDescription can throw if already stable
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } catch (e) {
          console.error("setRemoteDescription (answer) error:", e);
        }
        await flushPendingCandidates(fromId);
      } else if (data.candidate) {
        // received ICE candidate
        const pc = createPeerConnection(fromId);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.warn("addIceCandidate error:", e);
          }
        } else {
          // queue until remoteDescription is set
          if (!pendingCandidatesRef.current[fromId]) pendingCandidatesRef.current[fromId] = [];
          pendingCandidatesRef.current[fromId].push(data.candidate);
        }
      } else {
        // might be raw SDP object without .type string in top-level shape
        if (data.sdp && data.type) {
          if (data.type === 'offer') {
            await createAnswerForOffer(fromId, data);
          } else if (data.type === 'answer') {
            const pc = createPeerConnection(fromId);
            try { await pc.setRemoteDescription(new RTCSessionDescription(data)); } catch (e) { console.error(e); }
            await flushPendingCandidates(fromId);
          }
        }
      }
    } catch (err) {
      console.error("handleSignal general error:", err);
    }
  };

  // handle 'user-joined' broadcast from server
  // payload: { type: "user-joined", id: "<joiningId>", username: "<name>", clients: [...] }
  const handleUserJoined = (payload) => {
    const joinedId = payload.id;
    const joinedUsername = payload.username;
    const clients = Array.from(payload.clients || []);

    // If this broadcast belongs to me (server included my username) assign my socket id
    if (!socketIdRef.current && joinedUsername === username) {
      socketIdRef.current = joinedId;
      console.log("Assigned local socket id:", socketIdRef.current);
      return; // don't create offers to everyone — existing users will create offers to this joining client
    }

    // If a new other user joined, and I'm already present, create an offer to that newcomer
    if (socketIdRef.current && joinedId !== socketIdRef.current) {
      // createOffer to the newcomer
      console.log("New user joined:", joinedId, "-> creating offer");
      createOffer(joinedId);
    }
  };

  const handleUserLeft = (payload) => {
    const id = payload.id;
    if (!id) return;
    setVideos(prev => prev.filter(v => v.socketId !== id));
    // cleanup peer connection
    const pc = connectionsRef.current[id];
    if (pc) {
      try { pc.close(); } catch (e) {}
      delete connectionsRef.current[id];
    }
    // cleanup pending
    delete pendingCandidatesRef.current[id];
  };

  // connect to server via SockJS
  const connectToSocketServer = () => {
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) {}
      socketRef.current = null;
    }
    const sock = new SockJS(server_url + "/ws");
    socketRef.current = sock;

    sock.onopen = () => {
      console.log("✅ SockJS connected");
      safeSend({ type: "join", username, room: window.location.href || "main-room" });
    };

    sock.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        // handle server message types
        switch (msg.type) {
          case "user-joined":
            handleUserJoined(msg);
            break;
          case "signal":
            // msg.from, msg.data
            handleSignal(msg.from, msg.data);
            break;
          case "chat":
            setMessages(prev => [...prev, { sender: msg.sender, data: msg.message }]);
            setNewMessages(n => n + 1);
            break;
          case "user-left":
            handleUserLeft(msg);
            break;
          default:
            console.log("Unknown server message:", msg);
        }
      } catch (e) {
        console.warn("socket onmessage parse error:", e);
      }
    };

    sock.onclose = () => {
      console.log("❌ SockJS connection closed");
    };

    sock.onerror = (err) => {
      console.error("Socket error:", err);
    };
  };

  // UI handlers
  const getMediaAndConnect = async () => {
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // stop previous tracks if any
      try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      window.localStream = permissionStream;
      if (localVideoref.current) localVideoref.current.srcObject = permissionStream;
      setVideo(true);
      setAudio(true);
      // now connect if not connected
      if (!socketRef.current) connectToSocketServer();
      else safeSend({ type: "join", username, room: window.location.href || "main-room" });
    } catch (e) {
      console.error("getMediaAndConnect error:", e);
      alert("Camera/Microphone permission required.");
    }
  };

  // user pressed connect from lobby
  const connect = () => {
    setAskForUsername(false);
    getMediaAndConnect();
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    safeSend({ type: "chat", message, sender: username });
    setMessages(prev => [...prev, { sender: username, data: message }]);
    setMessage("");
  };

  const handleVideoToggle = () => {
    setVideo(prev => {
      const next = !prev;
      try { window.localStream && window.localStream.getVideoTracks().forEach(t => t.enabled = next); } catch (e) {}
      return next;
    });
  };

  const handleAudioToggle = () => {
    setAudio(prev => {
      const next = !prev;
      try { window.localStream && window.localStream.getAudioTracks().forEach(t => t.enabled = next); } catch (e) {}
      return next;
    });
  };

  const handleScreenToggle = async () => {
    if (!screen) {
      try {
        const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // replace local stream tracks with screen tracks
        // stop camera tracks temporarily
        try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        window.localStream = disp;
        if (localVideoref.current) localVideoref.current.srcObject = disp;
        // replace tracks in existing peerConnections
        Object.values(connectionsRef.current).forEach(pc => {
          try {
            // remove senders and add screen tracks
            const senders = pc.getSenders();
            const videoTrack = disp.getVideoTracks()[0];
            const audioTrack = disp.getAudioTracks()[0] || null;
            senders.forEach(sender => {
              if (sender.track && sender.track.kind === 'video' && videoTrack) sender.replaceTrack(videoTrack);
              if (sender.track && sender.track.kind === 'audio' && audioTrack) sender.replaceTrack(audioTrack);
            });
          } catch (e) { console.warn(e); }
        });
        setScreen(true);
        // when screen sharing stops, revert to camera
        disp.getTracks().forEach(t => t.onended = async () => {
          try {
            const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            try { window.localStream && window.localStream.getTracks().forEach(tr => tr.stop()); } catch (e) {}
            window.localStream = cam;
            if (localVideoref.current) localVideoref.current.srcObject = cam;
            Object.values(connectionsRef.current).forEach(pc => {
              try {
                const senders = pc.getSenders();
                senders.forEach(sender => {
                  if (sender.track && sender.track.kind === 'video') {
                    const cameraTrack = cam.getVideoTracks()[0];
                    if (cameraTrack) sender.replaceTrack(cameraTrack);
                  }
                  if (sender.track && sender.track.kind === 'audio') {
                    const micTrack = cam.getAudioTracks()[0];
                    if (micTrack) sender.replaceTrack(micTrack);
                  }
                });
              } catch (e) { console.warn(e); }
            });
            setScreen(false);
          } catch (err) { console.warn("revert from screen share error:", err); }
        });
      } catch (e) {
        console.warn("screen share error:", e);
      }
    } else {
      // end screen share handled in onended above
      setScreen(false);
    }
  };

  const handleEndCall = () => {
    try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { socketRef.current && socketRef.current.close(); } catch (e) {}
    // navigate back (keeps UI handling same as before)
    router("/home");
  };

  // render
  return (
    <div>

      {askForUsername === true ?

        <div>
          <h2>Enter into Lobby </h2>
          <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
          <Button variant="contained" onClick={connect}>Connect</Button>

          <div>
            <video ref={localVideoref} autoPlay muted style={{ width: 240, height: 180 }} ></video>
          </div>
        </div> :

        <div className={styles.meetVideoContainer}>

          {showModal ? <div className={styles.chatRoom}>

            <div className={styles.chatContainer}>
              <h1>Chat</h1>

              <div className={styles.chattingDisplay}>
                {messages.length !== 0 ? messages.map((item, index) => {
                  return (
                    <div style={{ marginBottom: "20px" }} key={index}>
                      <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                      <p>{item.data}</p>
                    </div>
                  )
                }) : <p>No Messages Yet</p>}
              </div>

              <div className={styles.chattingArea}>
                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                <Button variant='contained' onClick={sendMessage}>Send</Button>
              </div>

            </div>
          </div> : <></>}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideoToggle} style={{ color: "white" }}>
              {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudioToggle} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ?
              <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>
                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton> : <></>}

            <Badge badgeContent={newMessages} max={999} color='secondary'>
              <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>

          </div>

          <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

          <div className={styles.conferenceView} id="remote-videos">
            {videos.map((videoObj) => (
              <div key={videoObj.socketId}>
                <video
                  data-socket={videoObj.socketId}
                  ref={ref => {
                    if (ref && videoObj.stream) {
                      ref.srcObject = videoObj.stream;
                    }
                  }}
                  autoPlay
                >
                </video>
              </div>
            ))}
          </div>

        </div>
      }
    </div>
  );
}
