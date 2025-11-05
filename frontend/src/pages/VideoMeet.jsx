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
// // import server from '../environment';
// import SockJS from 'sockjs-client';
// import styles from "../styles/videoComponent.module.css";

// const server_url = "http://localhost:8080";

// var connections = {};
// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
// };

// export default function VideoMeetComponent() {
//   const socketRef = useRef();
//   let socketIdRef = useRef();
//   const localVideoref = useRef();
//   const videoRef = useRef([]);

//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
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
//     getPermissions();
//   }, []);

//   useEffect(() => {
//     if (screen) getDisplayMedia();
//   }, [screen]);

//   const getPermissions = async () => {
//     try {
//       const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
//       setVideoAvailable(!!videoStream);

//       const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       setAudioAvailable(!!audioStream);

//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

//       const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable });
//       window.localStream = userMediaStream;
//       if (localVideoref.current) localVideoref.current.srcObject = userMediaStream;
//     } catch (err) {
//       console.log(err);
//     }
//   };

//   // const getDisplayMedia = async (stream) => {
//   //   try {
//   //     const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//   //     handleLocalStream(stream);
//   //   } catch (err) {
//   //     console.log(err);
//   //   }
//   //   stream.getTracks().forEach(track => track.onended = () => {
//   //     setScreen(false)

//   //     try {
//   //       let tracks = localVideoref.current.srcObject.getTracks()
//   //       tracks.forEach(track => track.stop())
//   //     } catch (e) { console.log(e) }

//   //     let blackSilence = (...args) => new MediaStream([black(...args), silence()])
//   //     window.localStream = blackSilence()
//   //     localVideoref.current.srcObject = window.localStream

//   //     getUserMedia()

//   //   })
//   // };










//   const getDisplayMedia = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//       handleLocalStream(stream);

//       stream.getTracks().forEach(track => track.onended = () => {
//         setScreen(false);
//         getUserMedia();
//       });
//     } catch (err) {
//       console.log("Screen share canceled:", err);
//       // Nothing else to do
//     }
//   }

//   // const handleLocalStream = (stream) => {
//   //   try {
//   //     window.localStream.getTracks().forEach(track => track.stop());
//   //   } catch (e) { }

//   //   window.localStream = stream;
//   //   if (localVideoref.current) localVideoref.current.srcObject = stream;

//   //   Object.values(connections).forEach(pc => {
//   //     if (pc) {
//   //       pc.addStream(window.localStream);
//   //       pc.createOffer().then(desc => {
//   //         pc.setLocalDescription(desc).then(() => {
//   //           sendSignal(pc.remoteId, { sdp: pc.localDescription });
//   //         });
//   //       });
//   //     }
//   //   });

//   //   stream.getTracks().forEach(track => track.onended = () => {
//   //     setScreen(false);
//   //     getUserMedia();
//   //   });
//   // };

//   const getUserMedia = async () => {
//     if (!video && !audio) return;
//     try {
//       let blackSilence = (...args) => new MediaStream([black(...args), silence()])
//       const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
//       handleLocalStream(stream);
//     } catch (err) {
//       console.log(err);
//     }
//   };

//   // const connectToSocketServer = () => {
//   //     socketRef.current = new SockJS(`${server_url}/ws`);

//   //     socketRef.current.onopen = () => {
//   //         console.log("Connected to WebSocket server");
//   //         socketRef.current.send(JSON.stringify({ type: "join-call", roomId: window.location.href, username, clientId: socketIdRef.current }));
//   //     };

//   //     socketRef.current.onmessage = (event) => {
//   //         const msg = JSON.parse(event.data);
//   //         switch (msg.type) {
//   //             case "signal":
//   //                 gotMessageFromServer(msg.fromId, JSON.stringify(msg.data));
//   //                 break;
//   //             case "user-joined":
//   //                 handleUserJoined(msg.userId, msg.clients);
//   //                 break;
//   //             case "user-left":
//   //                 setVideos(videos => videos.filter(v => v.socketId !== msg.userId));
//   //                 delete connections[msg.userId];
//   //                 break;
//   //             case "chat-message":
//   //                 addMessage(msg.data, msg.sender, msg.fromId);
//   //                 break;
//   //             default:
//   //                 console.log("Unknown message type:", msg.type);
//   //         }
//   //     };
//   // };


//   const connectToSocketServer = () => {
//     socketRef.current = new SockJS(`${server_url}/ws`);

//     socketRef.current.onopen = () => {
//       console.log("✅ Connected to WebSocket server");
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
//           setVideos(videos => videos.filter(v => v.socketId !== msg.userId));
//           delete connections[msg.userId];
//           break;
//         case "chat-message":
//           addMessage(msg.data, msg.sender, msg.fromId);
//           break;
//         default:
//           console.log("Unknown message type:", msg.type);
//       }
//     };

//     const handleUserJoined = (userId, clients) => {
//       console.log("User joined:", userId, "Clients:", clients);

//       clients.forEach((socketListId) => {
//         if (socketListId === socketIdRef.current) return;

//         if (!connections[socketListId]) {
//           // ✅ Create new RTCPeerConnection
//           connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
//           connections[socketListId].remoteId = socketListId;

//           // ✅ When ICE candidate found, send it to backend
//           connections[socketListId].onicecandidate = (event) => {
//             if (event.candidate) {
//               socketRef.current.send(JSON.stringify({
//                 type: "signal",
//                 toId: socketListId,
//                 fromId: socketIdRef.current,
//                 data: { ice: event.candidate }
//               }));
//             }
//           };

//           // ✅ When remote stream arrives
//           connections[socketListId].onaddstream = (event) => {
//             console.log("🎥 Remote stream from:", socketListId);

//             const videoExists = videoRef.current.find(v => v.socketId === socketListId);

//             if (videoExists) {
//               // Update existing video stream
//               setVideos(videos => {
//                 const updatedVideos = videos.map(v =>
//                   v.socketId === socketListId ? { ...v, stream: event.stream } : v
//                 );
//                 videoRef.current = updatedVideos;
//                 return updatedVideos;
//               });
//             } else {
//               // Add new video stream
//               const newVideo = {
//                 socketId: socketListId,
//                 stream: event.stream,
//                 autoplay: true,
//                 playsinline: true
//               };
//               setVideos(videos => {
//                 const updatedVideos = [...videos, newVideo];
//                 videoRef.current = updatedVideos;
//                 return updatedVideos;
//               });
//             }
//           };

//           // ✅ Add local stream (camera or screen)
//           if (window.localStream) {
//             connections[socketListId].addStream(window.localStream);
//           } else {
//             const blackSilence = (...args) => new MediaStream([black(...args), silence()]);
//             window.localStream = blackSilence();
//             connections[socketListId].addStream(window.localStream);
//           }

//           // ✅ Create SDP offer and send via WebSocket
//           connections[socketListId].createOffer().then((description) => {
//             connections[socketListId].setLocalDescription(description).then(() => {
//               socketRef.current.send(JSON.stringify({
//                 type: "signal",
//                 toId: socketListId,
//                 fromId: socketIdRef.current,
//                 data: { sdp: connections[socketListId].localDescription }
//               }));
//             }).catch(e => console.error(e));
//           });
//         }
//       });
//     };
//   };

//   const handleLocalStream = (stream) => {
//     try {
//       window.localStream.getTracks().forEach(track => track.stop());
//     } catch (e) { }

//     window.localStream = stream;
//     if (localVideoref.current) localVideoref.current.srcObject = stream;

//     Object.values(connections).forEach(pc => {
//       if (pc) {
//         pc.addStream(window.localStream);
//         pc.createOffer().then(desc => {
//           pc.setLocalDescription(desc).then(() => {
//             sendSignal(pc.remoteId, { sdp: pc.localDescription });
//           });
//         });
//       }
//     });

//     stream.getTracks().forEach(track => track.onended = () => {
//       setScreen(false);
//       getUserMedia();
//     });
//   };





//   const updateLocalStream = async () => {
//     let newStream; // ✅ Declare first

//     if (video || audio) {
//       newStream = await navigator.mediaDevices.getUserMedia({ video, audio });
//     } else {
//       newStream = new MediaStream([black(), silence()]);
//     }

//     // 🔽 Now safe to use
//     window.localStream = newStream;

//     localVideoref.current.srcObject = newStream;

//     // Update every peer connection
//     Object.values(connections).forEach(conn => {
//       const sender = conn.getSenders().find(s => s.track.kind === "video");
//       if (sender) sender.replaceTrack(newStream.getVideoTracks()[0]);
//     });
//   };














//   const sendSignal = (toId, data) => {
//     socketRef.current.send(JSON.stringify({ type: "signal", toId, fromId: socketIdRef.current, data }));
//   };

//   const gotMessageFromServer = (fromId, message) => {
//     var signal = JSON.parse(message);
//     if (!connections[fromId]) {
//       connections[fromId] = new RTCPeerConnection(peerConfigConnections);
//       connections[fromId].remoteId = fromId;
//       connections[fromId].onicecandidate = event => {
//         if (event.candidate) sendSignal(fromId, { ice: event.candidate });
//       };
//       connections[fromId].onaddstream = event => {
//         addRemoteVideo(fromId, event.stream);
//       };
//       if (window.localStream) connections[fromId].addStream(window.localStream);
//     }

//     const pc = connections[fromId];

//     if (signal.sdp) {
//       pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
//         if (signal.sdp.type === "offer") {
//           pc.createAnswer().then(desc => {
//             pc.setLocalDescription(desc).then(() => {
//               sendSignal(fromId, { sdp: pc.localDescription });
//             });
//           });
//         }
//       });
//     }

//     if (signal.ice) {
//       pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
//     }
//   };

//   // const handleUserJoined = (id, clients) => {
//   //   clients.forEach(socketListId => {
//   //     if (socketListId === socketIdRef.current) return;

//   //     if (!connections[socketListId]) {
//   //       connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
//   //       connections[socketListId].remoteId = socketListId;
//   //       connections[socketListId].onicecandidate = event => {
//   //         if (event.candidate) sendSignal(socketListId, { ice: event.candidate });
//   //       };
//   //       connections[socketListId].onaddstream = event => addRemoteVideo(socketListId, event.stream);

//   //       if (window.localStream) connections[socketListId].addStream(window.localStream);
//   //       connections[socketListId].createOffer().then(desc => {
//   //         connections[socketListId].setLocalDescription(desc).then(() => {
//   //           sendSignal(socketListId, { sdp: connections[socketListId].localDescription });
//   //         });
//   //       });
//   //     }
//   //   });
//   // };

//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(videos => {
//       if (videos.find(v => v.socketId === socketId)) {
//         return videos.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else {
//         return [...videos, { socketId, stream }];
//       }
//     });
//   };

//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };

//   const sendMessage = () => {
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
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
//   const handleVideo = async () => {
//     setVideo(!video);
//     await updateLocalStream();
//   };
//   const handleAudio = async () => {
//     setAudio(!audio);
//     await updateLocalStream();
//   };
//   // // useEffect(() => {
//   // //   if (screen !== undefined) {
//   // //     getDisplayMedia();
//   // //   }
//   // // , [screen])}
//   // useEffect(()=>{

//   // },[screen])
//   let handleScreen = () => {
//     setScreen(!screen);
//   }


//   const getDisplayMediaSuccess = (stream) => {
//     try {
//       // Stop previous tracks if any
//       if (window.localStream) {
//         window.localStream.getTracks().forEach(track => track.stop());
//       }

//       // Set new stream
//       window.localStream = stream;
//       localVideoref.current.srcObject = stream;

//       // Add stream to all connections
//       for (let id in connections) {
//         if (id === socketIdRef.current) continue;

//         connections[id].addStream(window.localStream);
//         connections[id].createOffer().then(description => {
//           connections[id].setLocalDescription(description)
//             .then(() => {
//               socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
//             })
//             .catch(e => console.log(e));
//         });
//       }

//       // Handle track ending (user stops screen share)
//       stream.getTracks().forEach(track => {
//         track.onended = () => {
//           setVideo(false);
//           setAudio(false);
//           let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
//           window.localStream = blackSilence();
//           localVideoref.current.srcObject = window.localStream;

//           for (let id in connections) {
//             connections[id].addStream(window.localStream);
//             connections[id].createOffer().then(description => {
//               connections[id].setLocalDescription(description)
//                 .then(() => {
//                   socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
//                 })
//                 .catch(e => console.log(e));
//             });
//           }
//         };
//       });

//     } catch (err) {
//       console.log("Error in getDisplayMediaSuccess:", err);
//     }
//   };












//   const handleScreenShare = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//       getDisplayMediaSuccess(stream);
//     } catch (err) {
//       console.log("Screen share canceled or denied:", err);
//       // Do nothing, just leave original camera stream
//     }
//   }


//   const handleEndCall = () => {
//     try {
//       window.localStream.getTracks().forEach(track => track.stop());
//     } catch (e) { }
//     window.location.href = "/";
//   };
//   const connect = () => {
//     setAskForUsername(false);
//     getUserMedia();
//     connectToSocketServer();
//   };

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

//             <Badge badgeContent={newMessages} max={999} color='orange'>
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













import React, { useEffect, useRef, useState } from 'react';
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import SockJS from 'sockjs-client';
import styles from "../styles/videoComponent.module.css";

const server_url = "http://localhost:8080";
var connections = {};
const peerConfigConnections = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export default function VideoMeetComponent() {
  const socketRef = useRef(null);
  const socketIdRef = useRef(String(Date.now()) + Math.floor(Math.random() * 10000));
  const localVideoref = useRef(null);
  const videoRef = useRef([]);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [video, setVideo] = useState(true); // user wants camera on/off
  const [audio, setAudio] = useState(true); // user wants mic on/off
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showModal, setModal] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    checkDeviceCapabilities();
    // cleanup on unmount
    return () => {
      try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) {}
      Object.values(connections).forEach(pc => {
        try { pc.close(); } catch (e) {}
      });
      connections = {};
    };
  }, []);

  useEffect(() => {
    // when screen state becomes true, start share; when false, restore camera/mic
    if (screen) {
      startScreenShare();
    } else {
      // restore camera/mic if previously available
      updateLocalStream({ useCamera: video, useMic: audio }).catch(() => {});
    }
  }, [screen]);

  // ---------- Device capability check ----------
  const checkDeviceCapabilities = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoAvailable(devices.some(d => d.kind === 'videoinput'));
      setAudioAvailable(devices.some(d => d.kind === 'audioinput'));
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    } catch (e) {
      console.log("Error enumerating devices:", e);
    }
  };

  // ---------- update local stream (camera/mic) ----------
  // accepts options so it doesn't rely on stale state
  const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
    // get new stream (camera or black+silence)
    let newStream;
    try {
      if (useCamera || useMic) {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: useCamera && videoAvailable ? true : false,
          audio: useMic && audioAvailable ? true : false
        });
      } else {
        // create silent/black stream
        newStream = new MediaStream([black(), silence()]);
      }
    } catch (err) {
      console.log("getUserMedia failed, falling back to black/silence:", err);
      newStream = new MediaStream([black(), silence()]);
    }

    // stop old tracks
    try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) {}

    window.localStream = newStream;
    if (localVideoref.current) localVideoref.current.srcObject = newStream;

    // replace tracks on every peer connection (if RTCRtpSender supports replaceTrack)
    Object.values(connections).forEach(pc => {
      try {
        const senders = pc.getSenders ? pc.getSenders() : [];
        // replace video
        if (useCamera && newStream.getVideoTracks()[0]) {
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && videoSender.replaceTrack) {
            videoSender.replaceTrack(newStream.getVideoTracks()[0]);
          } else if (pc.addTrack) {
            pc.addTrack(newStream.getVideoTracks()[0], newStream);
          }
        } else {
          // disable video sender if exists
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && videoSender.replaceTrack) {
            videoSender.replaceTrack(undefined);
          }
        }

        // replace audio
        if (useMic && newStream.getAudioTracks()[0]) {
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender && audioSender.replaceTrack) {
            audioSender.replaceTrack(newStream.getAudioTracks()[0]);
          } else if (pc.addTrack) {
            pc.addTrack(newStream.getAudioTracks()[0], newStream);
          }
        } else {
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender && audioSender.replaceTrack) {
            audioSender.replaceTrack(undefined);
          }
        }
      } catch (e) {
        console.log("Error replacing tracks on peer:", e);
      }
    });
  };

  // ---------- screen share flow ----------
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      // stop old and set new
      try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) {}
      window.localStream = stream;
      if (localVideoref.current) localVideoref.current.srcObject = stream;

      // add to peers
      Object.values(connections).forEach(pc => {
        try {
          // add tracks
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          // renegotiate
          pc.createOffer().then(desc => {
            return pc.setLocalDescription(desc);
          }).then(() => {
            sendSignal(pc.remoteId, { sdp: pc.localDescription });
          }).catch(e => console.log("Offer/renegotiate error:", e));
        } catch (e) { console.log(e); }
      });

      // when user stops screen share, restore camera/mic
      stream.getTracks().forEach(track => track.onended = () => {
        setScreen(false);
        updateLocalStream({ useCamera: video, useMic: audio }).catch(() => {});
      });
    } catch (err) {
      console.log("Screen share canceled or denied:", err);
      setScreen(false); // make sure UI stays consistent
    }
  };

  // ---------- helpers for silence / black ----------
  const silence = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    const audioTrack = dst.stream.getAudioTracks()[0];
    audioTrack.enabled = false;
    return audioTrack;
  };
  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    const videoTrack = stream.getVideoTracks()[0];
    videoTrack.enabled = false;
    return videoTrack;
  };

  // ---------- signaling helpers ----------
  const sendSignal = (toId, data) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "signal", toId, fromId: socketIdRef.current, data }));
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);
    if (!connections[fromId]) {
      const pc = new RTCPeerConnection(peerConfigConnections);
      pc.remoteId = fromId;
      pc.onicecandidate = event => {
        if (event.candidate) sendSignal(fromId, { ice: event.candidate });
      };
      pc.ontrack = (evt) => {
        // when remote track arrives set remote stream
        addRemoteVideo(fromId, evt.streams && evt.streams[0] ? evt.streams[0] : new MediaStream(evt.track ? [evt.track] : []));
      };
      // add existing local tracks
      try {
        if (window.localStream) {
          window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
        }
      } catch (e) { }
      connections[fromId] = pc;
    }
    const pc = connections[fromId];

    if (signal.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        if (signal.sdp.type === "offer") {
          return pc.createAnswer();
        }
      }).then(answerDesc => {
        if (!answerDesc) return;
        return pc.setLocalDescription(answerDesc).then(() => {
          sendSignal(fromId, { sdp: pc.localDescription });
        });
      }).catch(e => console.log(e));
    }

    if (signal.ice) {
      pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
    }
  };

  const addRemoteVideo = (socketId, stream) => {
    setVideos(prev => {
      if (prev.find(v => v.socketId === socketId)) {
        return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
      } else {
        return [...prev, { socketId, stream }];
      }
    });
  };

  // ---------- socket connect ----------
  const connectToSocketServer = () => {
    socketRef.current = new SockJS(`${server_url}/ws`);
    socketRef.current.onopen = () => {
      console.log("✅ Connected to WebSocket server");
      socketRef.current.send(JSON.stringify({
        type: "join-call",
        roomId: window.location.href,
        username,
        clientId: socketIdRef.current
      }));
    };

    socketRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "signal":
          gotMessageFromServer(msg.fromId, JSON.stringify(msg.data));
          break;
        case "user-joined":
          handleUserJoined(msg.userId, msg.clients);
          break;
        case "user-left":
          setVideos(v => v.filter(x => x.socketId !== msg.userId));
          delete connections[msg.userId];
          break;
        case "chat-message":
          addMessage(msg.data, msg.sender, msg.fromId);
          break;
        default:
          console.log("Unknown message type:", msg.type);
      }
    };
  };

  const handleUserJoined = (userId, clients) => {
    clients.forEach(socketListId => {
      if (socketListId === socketIdRef.current) return;
      if (!connections[socketListId]) {
        const pc = new RTCPeerConnection(peerConfigConnections);
        pc.remoteId = socketListId;
        pc.onicecandidate = event => {
          if (event.candidate) {
            socketRef.current.send(JSON.stringify({
              type: "signal", toId: socketListId, fromId: socketIdRef.current, data: { ice: event.candidate }
            }));
          }
        };
        pc.ontrack = (evt) => addRemoteVideo(socketListId, evt.streams[0]);
        try {
          if (window.localStream) {
            window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
          } else {
            pc.addTrack(black(), new MediaStream());
            pc.addTrack(silence(), new MediaStream());
          }
        } catch (e) { }
        connections[socketListId] = pc;
        // create offer
        pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
          socketRef.current.send(JSON.stringify({
            type: "signal",
            toId: socketListId,
            fromId: socketIdRef.current,
            data: { sdp: pc.localDescription }
          }));
        }).catch(e => console.log(e));
      }
    });
  };

  // ---------- chat ----------
  const addMessage = (data, sender, socketIdSender) => {
    setMessages(prev => [...prev, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
  };
  const sendMessage = () => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
    setMessage("");
  };

  // ---------- UI handlers ----------
  const handleVideo = async () => {
    const newVideo = !video;
    setVideo(newVideo);
    await updateLocalStream({ useCamera: newVideo, useMic: audio });
  };
  const handleAudio = async () => {
    const newAudio = !audio;
    setAudio(newAudio);
    await updateLocalStream({ useCamera: video, useMic: newAudio });
  };
  const handleScreenToggle = () => {
    // toggle; effect will start or stop screen share
    setScreen(prev => !prev);
  };

  const start = () => {
    setAskForUsername(false);
    updateLocalStream({ useCamera: video, useMic: audio }).catch(() => {});
    connectToSocketServer();
  };

  const handleEndCall = () => {
    try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) {}
    Object.values(connections).forEach(pc => { try { pc.close(); } catch (e) {} });
    connections = {};
    window.location.href = "/home";
  };

  return (
    <div>
      {askForUsername ? (
        <div>
          <h2>Enter into Lobby </h2>
          <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
          <Button variant="contained" onClick={start}>Connect</Button>
          <div>
            <video ref={localVideoref} autoPlay muted style={{ width: 320, height: 240 }} />
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal ? <div className={styles.chatRoom}>
            <div className={styles.chatContainer}>
              <h1>Chat</h1>
              <div className={styles.chattingDisplay}>
                {messages.length !== 0 ? messages.map((item, index) => (
                  <div style={{ marginBottom: "20px" }} key={index}>
                    <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                    <p>{item.data}</p>
                  </div>
                )) : <p>No Messages Yet</p>}
              </div>
              <div className={styles.chattingArea}>
                <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
                <Button variant='contained' onClick={sendMessage}>Send</Button>
              </div>
            </div>
          </div> : <></>}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>

            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable ? (
              <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            ) : null}

            <Badge badgeContent={newMessages} max={999} color='primary'>
              <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted style={{ width: 320, height: 240 }} />

          <div className={styles.conferenceView}>
            {videos.map((v) => (
              <div key={v.socketId}>
                <video
                  data-socket={v.socketId}
                  ref={ref => {
                    if (ref && v.stream) {
                      ref.srcObject = v.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
