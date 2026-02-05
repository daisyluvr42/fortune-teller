//
//  ChatView.swift
//  FortuneTeller
//
//  AI Master chat interface for interactive fortune consultation.
//

import SwiftUI

struct ChatView: View {
    
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ChatViewModel()
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                
                // MARK: - Messages List
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                            }
                            
                            if viewModel.isLoading {
                                TypingIndicator()
                            }
                        }
                        .padding()
                    }
                    .onChange(of: viewModel.messages.count) { _, _ in
                        if let lastMessage = viewModel.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
                
                // MARK: - Input Bar
                inputBar
            }
            .navigationTitle("大师解惑")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    // MARK: - Input Bar
    
    private var inputBar: some View {
        HStack(spacing: 12) {
            TextField("输入您的问题...", text: $viewModel.inputText)
                .textFieldStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(.systemGray6))
                )
                .focused($isInputFocused)
            
            Button {
                Task {
                    await viewModel.sendMessage()
                }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(
                        viewModel.inputText.isEmpty
                        ? AnyShapeStyle(Color.gray)  // 
                        : AnyShapeStyle(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                    )
            }
            .disabled(viewModel.inputText.isEmpty || viewModel.isLoading)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }
}

// MARK: - Chat Message Model

struct ChatMessage: Identifiable {
    let id = UUID()
    let content: String
    let isUser: Bool
    let timestamp: Date
}

// MARK: - Chat ViewModel

@MainActor
final class ChatViewModel: ObservableObject {
    
    @Published var messages: [ChatMessage] = []
    @Published var inputText: String = ""
    @Published var isLoading: Bool = false
    
    private let networkManager = NetworkManager.shared
    
    // Default user data for context (in production, fetch from stored profile)
    private let defaultUserInput = UserInput(
        birthYear: 1990,
        month: 1,
        day: 1,
        hour: 12,
        gender: "男"
    )
    
    init() {
        // Add welcome message
        messages.append(ChatMessage(
            content: "您好！我是命理大师，请问有什么可以帮您解答的？\n\n您可以问我关于事业、感情、健康等方面的问题。",
            isUser: false,
            timestamp: Date()
        ))
    }
    
    func sendMessage() async {
        let userText = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userText.isEmpty else { return }
        
        // Add user message
        messages.append(ChatMessage(
            content: userText,
            isUser: true,
            timestamp: Date()
        ))
        inputText = ""
        isLoading = true
        
        do {
            let response = try await networkManager.fetchAnalysis(
                userData: defaultUserInput,
                questionType: "大师解惑",
                customQuestion: userText
            )
            
            messages.append(ChatMessage(
                content: response,
                isUser: false,
                timestamp: Date()
            ))
        } catch {
            messages.append(ChatMessage(
                content: "抱歉，暂时无法连接到服务器。请稍后再试。",
                isUser: false,
                timestamp: Date()
            ))
        }
        
        isLoading = false
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    
    var body: some View {
        HStack {
            if message.isUser { Spacer(minLength: 60) }
            
            Text(message.content)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(message.isUser ? Color.blue : Color(.systemGray5))
                )
                .foregroundStyle(message.isUser ? .white : .primary)
            
            if !message.isUser { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    @State private var dotCount = 0
    
    var body: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.gray)
                        .frame(width: 8, height: 8)
                        .opacity(dotCount == index ? 1.0 : 0.3)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemGray5))
            )
            
            Spacer()
        }
        .onAppear {
            Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { _ in
                dotCount = (dotCount + 1) % 3
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ChatView()
}
