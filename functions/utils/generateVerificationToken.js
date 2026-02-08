import jwt from "jsonwebtoken";

const generateVerificationToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export default generateVerificationToken;
