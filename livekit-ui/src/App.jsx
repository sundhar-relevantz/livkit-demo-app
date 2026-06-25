import { useEffect, useState } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";

function App() {
  const [token, setToken] = useState(null);

useEffect(() => {
  const fetchToken = async () => {
    try {
      const res = await fetch("http://192.168.11.132:8000/livekit/token", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_name: "hello",
          participant_identity: "user",
          participant_name: "sundhar",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log(data);
      // Assuming API returns { token: "..." }
      setToken(data.token);
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  fetchToken();
}, []);

  if (!token) return <div>Loading...</div>;

  return (
    <div style={{ height: "100vh" }}>
      <LiveKitRoom
        video
        audio
        serverUrl="ws://192.168.11.132:7880"
        token={token}
        connect={true}
        data-lk-theme="default"
        style={{ height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}

export default App;