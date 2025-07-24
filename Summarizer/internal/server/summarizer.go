package server

import (
	"context"
	"log"

	"summarizer/internal/gemini"
	pb "summarizer/pb"
)

// SummarizerServer implements the gRPC service
type SummarizerServer struct {
	pb.UnimplementedSummarizerServiceServer
}

func (s *SummarizerServer) Summarize(ctx context.Context, req *pb.SummarizeRequest) (*pb.SummarizeResponse, error) {
	log.Println("🔹 Received summarization request with", len(req.Messages), "messages")

	summary, err := gemini.SummarizeMessages(req.Messages)
	if err != nil {
		log.Println("❌ Error summarizing:", err)
		return nil, err
	}

	return &pb.SummarizeResponse{Summary: summary}, nil
}
