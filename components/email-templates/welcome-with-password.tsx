interface WelcomeWithPasswordEmailProps {
  orgName: string;
  email: string;
  password: string;
  changePasswordUrl: string;
}

export default function WelcomeWithPasswordEmail({
  orgName,
  email,
  password,
  changePasswordUrl,
}: WelcomeWithPasswordEmailProps) {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "24px" }}>
      <h2>Welcome to {orgName}</h2>
      <p>An account has been created for you. Here are your login details:</p>
      <p>
        <strong>Email:</strong> {email}
        <br />
        <strong>Temporary password:</strong> {password}
      </p>
      <p>
        You can log in right away with this password. If you'd like to change it,
        click below:
      </p>
      <a
        href={changePasswordUrl}
        style={{
          display: "inline-block",
          padding: "10px 20px",
          background: "#000",
          color: "#fff",
          textDecoration: "none",
          borderRadius: "6px",
        }}
      >
        Change my password
      </a>
    </div>
  );
}