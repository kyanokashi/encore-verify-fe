import axios from 'axios';
/** https://cryptix-backend.herokuapp.com */
/** https://server.encore.fans */
/** https://server.verify.encore.fans */
const instance = axios.create({baseURL: 'https://server.verify.encore.fans'});
export default instance
