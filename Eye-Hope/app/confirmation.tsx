import React from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";

// 카테고리 매핑 함수들
const categoryToId = (category: string): number => {
  const mapping: { [key: string]: number } = {
    "경제": 1,
    "증권": 2,
    "스포츠": 3,
    "연예": 4,
    "정치": 5,
    "IT": 6,
    "사회": 7,
    "오피니언": 8,
  };
  return mapping[category] || 0;
};

const idToCategory = (id: number): string => {
  const mapping: { [key: number]: string } = {
    1: "경제",
    2: "증권", 
    3: "스포츠",
    4: "연예",
    5: "정치",
    6: "IT",
    7: "사회",
    8: "오피니언",
  };
  return mapping[id] || "";
};

interface UserNewsData {
  deviceId: string;
  newsIds: number[];
}

export default function ConfirmationScreen() {
  const { categories, fromSettings } = useLocalSearchParams<{
    categories: string;
    fromSettings?: string;
  }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // JSON 문자열을 파싱하여 카테고리 배열로 변환
  const selectedCategories = categories ? JSON.parse(categories) : [];

  // 백엔드에 사용자 관심 뉴스 저장
  const saveUserNews = async (newsData: UserNewsData) => {
    try {
      console.log("📰 === 사용자 관심 뉴스 저장 API 호출 시작 ===");
      console.log("📤 전송 데이터:", JSON.stringify(newsData, null, 2));
      
      const response = await fetch("http://13.124.111.205:8080/api/users/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newsData),
      });

      console.log("📥 응답 상태:", response.status);
      
      const result = await response.json();
      console.log("📥 응답 데이터:", JSON.stringify(result, null, 2));
      console.log("📰 === 사용자 관심 뉴스 저장 API 호출 종료 ===");

      if (!response.ok || !result.success) {
        throw new Error(result.message || "관심 뉴스 저장에 실패했습니다.");
      }

      return result;
    } catch (error) {
      console.error("🚨 관심 뉴스 저장 오류:", error);
      throw error;
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleConfirm = async () => {
    console.log("=== 카테고리 확인 완료 ===");
    console.log("선택된 카테고리:", selectedCategories);
    console.log("fromSettings 파라미터:", fromSettings);

    setLoading(true);

    try {
      // DeviceId 가져오기
      const deviceId = await AsyncStorage.getItem("deviceId");
      if (!deviceId) {
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      // 카테고리를 ID로 변환
      const newsIds = selectedCategories.map((category: string) => categoryToId(category));
      console.log("변환된 뉴스 ID:", newsIds);

      // 백엔드에 관심 뉴스 저장
      const userNewsData: UserNewsData = {
        deviceId: deviceId,
        newsIds: newsIds,
      };

      await saveUserNews(userNewsData);
      console.log("✅ 관심 뉴스가 백엔드에 저장되었습니다");

      // 로컬스토리지에도 저장 (캐시용)
      await AsyncStorage.setItem("userCategories", JSON.stringify(selectedCategories));
      console.log("✅ 관심 뉴스가 로컬에도 저장되었습니다");

      // fromSettings 파라미터 확인
      if (fromSettings === "true") {
        console.log("설정 페이지로 돌아가기");
        router.push({
          pathname: "/(tabs)/settings",
          params: {
            selectedCategories: JSON.stringify(selectedCategories),
            fromNewsUpdate: "true",
          },
        });
      } else {
        console.log("시간대 선택으로 이동");
        // 일반 플로우라면 timeSelect 화면으로 이동
        router.push({
          pathname: "/timeSelect",
          params: { categories: JSON.stringify(selectedCategories) },
        });
      }

    } catch (error) {
      console.error("관심 뉴스 저장 오류:", error);
      
      const errorMessage = error instanceof Error ? error.message : "관심 뉴스 저장 중 오류가 발생했습니다.";
      
      Alert.alert(
        "오류",
        errorMessage,
        [
          {
            text: "그래도 진행",
            onPress: () => {
              // 오류가 발생해도 로컬에만 저장하고 진행
              AsyncStorage.setItem("userCategories", JSON.stringify(selectedCategories));
              
              if (fromSettings === "true") {
                router.push({
                  pathname: "/(tabs)/settings",
                  params: {
                    selectedCategories: JSON.stringify(selectedCategories),
                  },
                });
              } else {
                router.push({
                  pathname: "/timeSelect",
                  params: { categories: JSON.stringify(selectedCategories) },
                });
              }
            },
          },
          {
            text: "재시도",
            style: "cancel",
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 안내 문구 박스 */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          선택하신 뉴스 기사를 확인할게요.
        </Text>
      </View>

      {/* 중간 카테고리 목록 */}
      <View style={styles.categoriesContainer}>
        {selectedCategories.map((category: string, index: number) => (
          <View key={index} style={styles.categoryItem}>
            <View style={styles.diamondIcon}>
              <Text style={styles.diamondText}>{category}</Text>
              {/* 카테고리 ID 표시 (개발용 - 필요시 제거) */}
              <Text style={styles.categoryIdText}>ID: {categoryToId(category)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 하단 요약 박스 */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          총 {selectedCategories.length}가지 관심 뉴스를 선택하셨어요.
        </Text>
        <Text style={styles.summaryText}>
          관심 분야는 언제든지 바꿀 수 있어요.
        </Text>
      </View>

      {/* 하단 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.confirmButton,
            pressed && styles.pressedButton,
            loading && styles.disabledButton,
          ]}
          onPress={handleConfirm}
          disabled={loading}
          accessibilityLabel="맞아요 버튼"
          accessibilityRole="button"
          accessibilityHint="선택한 카테고리가 맞다면 두 번 탭하세요"
        >
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={[styles.confirmButtonText, loading && styles.disabledButtonText]}>
              맞아요
            </Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.modifyButton,
            pressed && styles.pressedButton,
          ]}
          onPress={handleGoBack}
          disabled={loading}
          accessibilityLabel="아니에요 수정할래요 버튼"
          accessibilityRole="button"
          accessibilityHint="카테고리를 수정하려면 두 번 탭하세요"
        >
          <Text style={styles.modifyButtonText}>아니에요 수정할래요</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  instructionContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    padding: 16,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  instructionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#000000",
    lineHeight: 24,
  },
  categoriesContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: "center",
  },
  categoryItem: {
    marginBottom: 16,
  },
  diamondIcon: {
    width: 120,
    height: 80, // 높이를 늘려서 ID도 표시
    backgroundColor: "#276ADC",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  diamondText: {
    fontSize: 24,
    fontWeight: "500",
    color: "white",
    textAlign: "center",
    width: 80,
  },
  categoryIdText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 4,
  },
  summaryContainer: {
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  summaryText: {
    fontSize: 16,
    textAlign: "center",
    color: "#000000",
    lineHeight: 24,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButton: {
    backgroundColor: "#87CEEB",
  },
  modifyButton: {
    backgroundColor: "#87CEEB",
  },
  disabledButton: {
    backgroundColor: "#C7C7CC",
    elevation: 0,
    shadowOpacity: 0,
  },
  pressedButton: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
  },
  disabledButtonText: {
    color: "#8E8E93",
  },
  modifyButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    lineHeight: 28,
  },
});