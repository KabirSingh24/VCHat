let IS_PROD = true;
const server = IS_PROD ?
    "https://vchat-rp52.onrender.com" :
    "http://localhost:8000"


export default server;