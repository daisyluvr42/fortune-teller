//
//  SingleInputView.swift
//  FortuneTeller
//
//  Single person Bazi chart calculation and analysis input form.
//

import SwiftUI

struct SingleInputView: View {
    
    @EnvironmentObject var profileManager: ProfileManager
    @StateObject private var viewModel = HomeViewModel()
    @State private var hasAutoFetched: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                
                // MARK: - Input Section
                inputSection
                
                // MARK: - Action Buttons
                actionButtons
                
                // MARK: - Debug Output
                debugSection
                
            }
            .padding()
        }
        .navigationTitle("单人八字")
        .navigationBarTitleDisplayMode(.inline)
        .alert("错误", isPresented: $viewModel.showError) {
            Button("确定", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "未知错误")
        }
        .onAppear {
            // Auto-fill from active profile if available
            if let profile = profileManager.activeProfile, !hasAutoFetched {
                viewModel.populate(from: profile)
                hasAutoFetched = true
                
                // Auto-fetch with slight delay for smooth UX
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    Task {
                        await viewModel.fetchChart()
                    }
                }
            }
        }
    }
    
    // MARK: - Input Section
    
    private var inputSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            
            Text("出生信息")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            // Year Picker
            HStack {
                Text("年份")
                    .frame(width: 60, alignment: .leading)
                Picker("年份", selection: $viewModel.birthYear) {
                    ForEach(viewModel.availableYears, id: \.self) { year in
                        Text("\(year)年").tag(year)
                    }
                }
                .pickerStyle(.menu)
            }
            
            // Lunar Calendar Toggle
            HStack {
                Text("历法")
                    .frame(width: 60, alignment: .leading)
                Toggle(viewModel.isLunar ? "农历" : "公历", isOn: $viewModel.isLunar)
                    .toggleStyle(.button)
                    .tint(viewModel.isLunar ? .orange : .blue)
            }
            
            // Month Picker
            HStack {
                Text("月份")
                    .frame(width: 60, alignment: .leading)
                Picker("月份", selection: $viewModel.birthMonth) {
                    ForEach(viewModel.availableMonths, id: \.self) { month in
                        Text("\(month)月").tag(month)
                    }
                }
                .pickerStyle(.menu)
            }
            
            // Day Picker
            HStack {
                Text("日期")
                    .frame(width: 60, alignment: .leading)
                Picker("日期", selection: $viewModel.birthDay) {
                    ForEach(viewModel.availableDays, id: \.self) { day in
                        Text("\(day)日").tag(day)
                    }
                }
                .pickerStyle(.menu)
            }
            
            // Hour Picker
            HStack {
                Text("时辰")
                    .frame(width: 60, alignment: .leading)
                Picker("时辰", selection: $viewModel.birthHour) {
                    ForEach(viewModel.availableHours, id: \.self) { hour in
                        Text("\(hour)时").tag(hour)
                    }
                }
                .pickerStyle(.menu)
            }
            
            // Gender Picker
            HStack {
                Text("性别")
                    .frame(width: 60, alignment: .leading)
                Picker("性别", selection: $viewModel.selectedGender) {
                    Text("男").tag("男")
                    Text("女").tag("女")
                }
                .pickerStyle(.segmented)
            }
            
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    // MARK: - Action Buttons
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            
            // Health Check Button
            Button {
                Task {
                    await viewModel.checkHealth()
                }
            } label: {
                Label("检查 API 连接", systemImage: "network")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            
            // Fetch Chart Button
            Button {
                Task {
                    await viewModel.fetchChart()
                }
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label("获取八字排盘", systemImage: "sparkles")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isLoading)
            
            // Analysis Buttons
            HStack(spacing: 12) {
                Button {
                    Task {
                        await viewModel.fetchAnalysis(topic: "整体命格")
                    }
                } label: {
                    Text("整体命格")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
                
                Button {
                    Task {
                        await viewModel.fetchAnalysis(topic: "事业运势")
                    }
                } label: {
                    Text("事业运势")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(viewModel.isLoading)
            }
            
        }
    }
    
    // MARK: - Debug Section
    
    private var debugSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            
            Text("调试输出")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            ScrollView {
                Text(viewModel.debugOutput)
                    .font(.system(.body, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
            }
            .frame(minHeight: 200)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SingleInputView()
            .environmentObject(ProfileManager())
    }
}

