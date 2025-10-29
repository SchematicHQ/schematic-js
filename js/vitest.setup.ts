import { WebSocket } from "mock-socket";

// Set up global WebSocket mock
global.WebSocket = WebSocket as any;
