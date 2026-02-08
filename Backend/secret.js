const jwt = require('jsonwebtoken');

console.log('=== VERIFYING THE FIX ===\n');

// Your secrets
const ACCESS_SECRET = "dev_access_secret_12345";
const REFRESH_SECRET = "dev_refresh_secret_12345";

// Create test tokens
console.log('1. Creating test tokens:');
const testAccessToken = jwt.sign(
  { _id: 'test123', email: 'test@example.com' },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

const testRefreshToken = jwt.sign(
  { _id: 'test123' },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

console.log('Access token:', testAccessToken.substring(0, 50) + '...');
console.log('Refresh token:', testRefreshToken.substring(0, 50) + '...');

// Verify them
console.log('\n2. Verifying tokens:');
try {
  jwt.verify(testAccessToken, ACCESS_SECRET);
  console.log('✅ Access token verified with ACCESS secret');
} catch (e) {
  console.log('❌ Access token failed:', e.message);
}

try {
  jwt.verify(testRefreshToken, REFRESH_SECRET);
  console.log('✅ Refresh token verified with REFRESH secret');
} catch (e) {
  console.log('❌ Refresh token failed:', e.message);
}

// Test with wrong secrets
console.log('\n3. Testing with wrong secrets (should fail):');
try {
  jwt.verify(testAccessToken, "wrong_secret");
  console.log('❌ Access token should NOT work with wrong secret');
} catch (e) {
  console.log('✅ Access token correctly rejects wrong secret');
}

// Test your current token
console.log('\n4. Testing your current token:');
const yourToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTc5YTU4OWI3NTFlNmM2MWZhODcyNTgiLCJlbWFpbCI6Im5nMzU1Nzg3OUBnbWFpbC5jb20iLCJyb2xlIjoxLCJyb2xlTmFtZSI6IkFkbWluIiwiaWF0IjoxNzcwNTQzNjcyLCJleHAiOjE3NzA2MzAwNzJ9.51Pt3GIjzMHeG_pjwGflXN7WtznPC537mKkKZt-gtuE";

try {
  const decoded = jwt.verify(yourToken, ACCESS_SECRET);
  console.log('✅ Your current token works with ACCESS_SECRET!');
  console.log('   User:', decoded._id, decoded.email);
} catch (e) {
  console.log('❌ Your token still fails:', e.message);
}