package main

import (
	"log"
	"net"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"summarizer/internal/server"
	pb "summarizer/pb"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
	}

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterSummarizerServiceServer(s, &server.SummarizerServer{})
	log.Println("gRPC server listening on port 50051")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}