import { WebSocket } from "mock-socket";

// Set up global WebSocket mock
globalThis.WebSocket = WebSocket as typeof globalThis.WebSocket;
