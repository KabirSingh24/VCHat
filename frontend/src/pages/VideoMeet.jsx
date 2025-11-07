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

const server_url = server;

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
      try { socketRef.current && socketRef.current.close(); } catch (e) { }
      // stop local tracks
      try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
      // close peer connections
      try {
        const conns = connectionsRef.current;
        Object.keys(conns).forEach(k => {
          try { conns[k].close(); } catch (e) { }
        });
      } catch (e) { }
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
      try { pc.close(); } catch (e) { }
      delete connectionsRef.current[id];
    }
    // cleanup pending
    delete pendingCandidatesRef.current[id];
  };

  // connect to server via SockJS
  const connectToSocketServer = () => {
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) { }
      socketRef.current = null;
    }
    const sock = new SockJS(`${server_url}/ws`);
    socketRef.current = sock;

    sock.onopen = () => {
      console.log("SockJS connected");
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
            // setMessages(prev => [...prev, { sender: msg.sender, data: msg.message }]);
            // setNewMessages(n => n + 1);
            if (msg.sender !== username) {  // ignore own message broadcast
              setMessages(prev => [...prev, { sender: msg.sender, data: msg.message }]);
              setNewMessages(n => n + 1);
            }
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
      console.log("SockJS connection closed");
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
      try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
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
      try { window.localStream && window.localStream.getVideoTracks().forEach(t => t.enabled = next); } catch (e) { }
      return next;
    });
  };

  const handleAudioToggle = () => {
    setAudio(prev => {
      const next = !prev;
      try { window.localStream && window.localStream.getAudioTracks().forEach(t => t.enabled = next); } catch (e) { }
      return next;
    });
  };

  const handleScreenToggle = async () => {
    if (!screen) {
      try {
        const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // replace local stream tracks with screen tracks
        // stop camera tracks temporarily
        try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
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
            try { window.localStream && window.localStream.getTracks().forEach(tr => tr.stop()); } catch (e) { }
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
    try { window.localStream && window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
    try { socketRef.current && socketRef.current.close(); } catch (e) { }
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
                  style={{ width: "540", height: "380" }}
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
