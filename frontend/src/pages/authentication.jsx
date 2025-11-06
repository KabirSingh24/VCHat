import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';


const defaultTheme = createTheme();

export default function Authentication() {

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");


  const [formState, setFormState] = React.useState(0);
  const [open, setOpen] = React.useState(false);


  const { handlerRegister, handleLogin } = React.useContext(AuthContext);

  let handleAuth = async () => {
    try {
      if (formState === 0) {
        let result = await handleLogin(username, password);
        console.log(result);
        setMessage(result);
        setError("");
      }
      if (formState === 1) {
        let result = await handlerRegister(name, username, password);
        setMessage(result);
        setOpen(true);
        setFormState(0);
        setPassword("");
        setUsername("");
      }
    } catch (err) {
      console.log(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Something went wrong"); // fallback
      }
      setMessage(""); // clear any previous success message
    }
  }

  return (
    <Box display="flex" height="100vh">
      <Box
        sx={{
          width: "50%",
          backgroundImage: "url('/background.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <Box
        sx={{
          width: "50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "start",
          alignItems: "center",
          backgroundColor: "#fff",
          boxShadow: "2px 0px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Avatar sx={{ m: 1,mt:5, bgcolor: 'secondary.main' }}><LockOutlinedIcon />
        </Avatar>


          <div>
            <Button variant={formState === 0 ? "contained" : ""} onClick={() => { setFormState(0) }}>
                                Sign In
            </Button>
            <Button variant={formState === 1 ? "contained" : ""} onClick={() => { setFormState(1) }}>
                                Sign Up
            </Button>
          </div>

          <Box component="form" noValidate sx={{ mt: 1 }}>
              {formState === 1 ? <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Full Name"
                                name="username"
                                value={name}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
          /> : <></>}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                autoFocus
                                onChange={(e) => setUsername(e.target.value)}

                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                value={password}
                                type="password"
                                onChange={(e) => setPassword(e.target.value)}

                                id="password"
                            />

                            <p style={{color:"red"}}>{error}</p>

                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                onClick={handleAuth}
                            >
                                {formState === 0 ? "Login " : "Register"}
                            </Button>
      </Box>
      </Box>
      <Snackbar

                open={open}
                autoHideDuration={4000}
                message={message}
            />
    </Box>
  );
}