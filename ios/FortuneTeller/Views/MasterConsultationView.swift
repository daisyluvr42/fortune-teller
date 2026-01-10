//
//  MasterConsultationView.swift
//  FortuneTeller
//
//  Standalone AI Master consultation view for deep fortune consultation.
//

import SwiftUI

struct MasterConsultationView: View {
    
    @StateObject private var viewModel = ConsultationViewModel()
    @FocusState private var isInputFocused: Bool
    
    var body: some View {
        VStack(spacing: 0) {
            
            // MARK: - Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            ConsultationBubble(message: message)
                                .id(message.id)
                        }
                        
                        if viewModel.isLoading {
                            ConsultationTypingIndicator()
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
            consultationInputBar
        }
        .navigationTitle("深度咨询")
        .navigationBarTitleDisplayMode(.inline)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.96, blue: 1.0),
                    Color.white
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
    
    // MARK: - Input Bar
    
    private var consultationInputBar: some View {
        HStack(spacing: 12) {
            TextField("请输入您的问题...", text: $viewModel.inputText)
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
                        ? AnyShapeStyle(Color.gray)
                        : AnyShapeStyle(
                            LinearGradient(
                                colors: [.purple, .blue],
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

// MARK: - Consultation Message Model

struct ConsultationMessage: Identifiable {
    let id = UUID()
    let content: String
    let isUser: Bool
    let timestamp: Date
}

// MARK: - Consultation ViewModel

@MainActor
final class ConsultationViewModel: ObservableObject {
    
    @Published var messages: [ConsultationMessage] = []
    @Published var inputText: String = ""
    @Published var isLoading: Bool = false
    
    private let networkManager = NetworkManager.shared
    
    // Default user data for context
    private let defaultUserInput = UserInput(
        birthYear: 1990,
        month: 1,
        day: 1,
        hour: 12,
        gender: "男"
    )
    
    init() {
        // Add welcome message
        messages.append(ConsultationMessage(
            content: "欢迎使用深度咨询服务！\n\n我是您的专属命理顾问，可以为您提供更加深入的运势分析和人生指导。请描述您想要咨询的问题。",
            isUser: false,
            timestamp: Date()
        ))
    }
    
    func sendMessage() async {
        let userText = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !userText.isEmpty else { return }
        
        // Add user message
        messages.append(ConsultationMessage(
            content: userText,
            isUser: true,
            timestamp: Date()
        ))
        inputText = ""
        isLoading = true
        
        do {
            let response = try await networkManager.fetchAnalysis(
                userData: defaultUserInput,
                questionType: "深度咨询",
                customQuestion: userText
            )
            
            messages.append(ConsultationMessage(
                content: response,
                isUser: false,
                timestamp: Date()
            ))
        } catch {
            messages.append(ConsultationMessage(
                content: "抱歉，暂时无法连接到服务器。请稍后再试。",
                isUser: false,
                timestamp: Date()
            ))
        }
        
        isLoading = false
    }
}

// MARK: - Consultation Bubble

struct ConsultationBubble: View {
    let message: ConsultationMessage
    
    var body: some View {
        HStack {
            if message.isUser { Spacer(minLength: 60) }
            
            Text(message.content)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(message.isUser ? Color.purple : Color(.systemGray5))
                )
                .foregroundStyle(message.isUser ? .white : .primary)
            
            if !message.isUser { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Typing Indicator

struct ConsultationTypingIndicator: View {
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
    NavigationStack {
        MasterConsultationView()
    }
}
