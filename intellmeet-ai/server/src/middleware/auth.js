import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ Auth failed: Bearer token missing in headers");
    return res.status(401).json({ message: 'No token provided' });
  }

  // Token nikalo aur extra double/single quotes ko replace karke clean karo
  let token = authHeader.split(' ')[1];
  if (token) {
    token = token.trim().replace(/['"]/g, '');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ JWT Verification Failed:", error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export default verifyToken;