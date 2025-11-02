import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome</Text>

      <Button title="Login" onPress={() => router.push('/login')} />
      <View style={{ height: 10 }} />
      <Button title="Sign Up" onPress={() => router.push('/signup')} />
    </View>
  );
}
