package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"ticketrush/internal/service"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for this project
	},
}

type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Send chan []byte
}

type clientMessage struct {
	Action  string `json:"action"`  // "subscribe" or "unsubscribe"
	Channel string `json:"channel"` // "global" or "event:{eventID}"
}

func ServeWs(hub *Hub, authService service.AuthService, w http.ResponseWriter, r *http.Request) {
	var tokenString string
	protocol := r.Header.Get("Sec-WebSocket-Protocol")

	// 1. Try to get token from cookie
	cookie, err := r.Cookie("tr_access_token")
	if err == nil {
		tokenString = cookie.Value
	} else if protocol != "" {
		// 2. Fallback to Sec-WebSocket-Protocol header
		tokenString = protocol
	}

	if tokenString == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	_, err = authService.ValidateToken(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var responseHeader http.Header
	if protocol != "" {
		responseHeader = http.Header{
			"Sec-WebSocket-Protocol": []string{protocol},
		}
	}

	conn, err := upgrader.Upgrade(w, r, responseHeader)
	if err != nil {
		log.Printf("Upgrade error: %v", err)
		return
	}
	client := &Client{Hub: hub, Conn: conn, Send: make(chan []byte, 256)}
	client.Hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var msg clientMessage
		if err := json.Unmarshal(message, &msg); err == nil {
			if msg.Action == "ping" {
				continue
			}
			if msg.Action == "subscribe" && msg.Channel != "" {
				c.Hub.Subscribe(c, msg.Channel)
			} else if msg.Action == "unsubscribe" && msg.Channel != "" {
				c.Hub.Unsubscribe(c, msg.Channel)
			}
		}
	}
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()
	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}
