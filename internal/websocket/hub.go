package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan BroadcastMessage
	register   chan *Client
	unregister chan *Client
	channels   map[string]map[*Client]bool
	mu         sync.RWMutex
}

type BroadcastMessage struct {
	Channel string
	Data    interface{}
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan BroadcastMessage, 1024),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		channels:   make(map[string]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				for chName, clientsInChannel := range h.channels {
					if _, ok := clientsInChannel[client]; ok {
						delete(clientsInChannel, client)
						if len(clientsInChannel) == 0 {
							delete(h.channels, chName)
						}
					}
				}
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			payload, err := json.Marshal(message.Data)
			if err != nil {
				log.Printf("Error marshaling broadcast data: %v", err)
				continue
			}
			h.mu.RLock()
			if message.Channel == "global" {
				for client := range h.clients {
					select {
					case client.Send <- payload:
					default:
						// Cannot unregister here to avoid deadlock, readPump handles close
					}
				}
			} else {
				if clientsInChannel, ok := h.channels[message.Channel]; ok {
					for client := range clientsInChannel {
						select {
						case client.Send <- payload:
						default:
							// readPump will clean up
						}
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(channel string, data interface{}) {
	h.broadcast <- BroadcastMessage{
		Channel: channel,
		Data:    data,
	}
}

func (h *Hub) Subscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.channels[channel]; !ok {
		h.channels[channel] = make(map[*Client]bool)
	}
	h.channels[channel][client] = true
}

func (h *Hub) Unsubscribe(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clientsInChannel, ok := h.channels[channel]; ok {
		delete(clientsInChannel, client)
		if len(clientsInChannel) == 0 {
			delete(h.channels, channel)
		}
	}
}
