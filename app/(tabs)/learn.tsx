import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExternalLink } from 'lucide-react-native';
import Animated, {
  Layout
} from 'react-native-reanimated';
import { useRef } from 'react';
import AnimatedTabScreen from '@/components/AnimatedTabScreen';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const articles = [
  {
    id: '1',
    title: 'The Science of High-Intensity Training',
    description: 'Understanding why training to failure is effective for muscle growth and strength gains.',
    readTime: '5 min read',
  },
  {
    id: '2',
    title: 'Rest and Recovery',
    description: 'Why rest days are crucial for muscle growth and overall fitness progress.',
    readTime: '4 min read',
  },
  {
    id: '3',
    title: 'Proper Form Guide',
    description: 'Detailed instructions on maintaining proper form during exercises.',
    readTime: '7 min read',
  },
  {
    id: '4',
    title: 'Nutrition Basics',
    description: 'Essential nutrition guidelines to support your high-intensity training.',
    readTime: '6 min read',
  },
];

const resources = [
  {
    id: '1',
    title: 'Exercise Form Videos',
    url: 'https://example.com/form-videos',
  },
  {
    id: '2',
    title: 'Progress Tracking Guide',
    url: 'https://example.com/tracking',
  },
];

export default function LearnScreen() {
  const isMounted = useRef(true);

  return (
    <AnimatedTabScreen>
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>Master the Fundamentals</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>
            Featured Articles
          </Text>
          
          {articles.map((article, index) => (
            <AnimatedTouchableOpacity 
              key={article.id} 
              style={styles.articleCard}
              layout={Layout}
            >
              <View>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleDescription}>{article.description}</Text>
                <Text style={styles.readTime}>{article.readTime}</Text>
              </View>
            </AnimatedTouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>
            Additional Resources
          </Text>
          
          {resources.map((resource, index) => (
            <AnimatedTouchableOpacity
              key={resource.id}
              style={styles.resourceCard}
              onPress={() => Linking.openURL(resource.url)}
              layout={Layout}
            >
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <ExternalLink size={20} color="#007AFF" />
            </AnimatedTouchableOpacity>
          ))}

          <Animated.View 
            style={styles.principlesCard}
            layout={Layout}
          >
            <Text style={styles.principlesTitle}>Bruce's Core Principles</Text>
            <Text style={styles.principle}>1. Train to muscle failure</Text>
            <Text style={styles.principle}>2. Focus on compound movements</Text>
            <Text style={styles.principle}>3. Prioritize recovery between sessions</Text>
            <Text style={styles.principle}>4. Progress through intensity, not volume</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    // Add extra padding at bottom for better scrolling on iOS
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 16,
    color: '#666666',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    marginTop: 12,
    marginBottom: 16,
    color: '#1A1A1A',
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  articleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  articleDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  readTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#007AFF',
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  resourceTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  principlesCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  principlesTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  principle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 24,
  },
});
