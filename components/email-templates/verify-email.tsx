// components/email-templates/verify-email.tsx - COMPLETE
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface AWSVerifyEmailProps {
  verificationCode?: string;
}

export default function VerifyEmail({
  verificationCode, 
}: AWSVerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>Business Inventory Email Verification</Preview>
        <Container style={container}>
          <Section style={coverSection}>
            <Section style={imageSection}>
              <Img
                src="https://via.placeholder.com/200x60/3b82f6/ffffff?text=Business+Inventory"
                width="200"
                height="60"
                alt="Business Inventory Logo"
                style={logo}
              />
            </Section>
            <Section style={upperSection}>
              <Heading style={h1}>Email Verification Required</Heading>
              <Text style={mainText}>
                Thanks for starting the new Business account creation process. We
                want to make sure it's really you. Please enter the following
                verification code when prompted. If you don&apos;t want to
                create an account, you can ignore this message.
              </Text>
              <Section style={verificationSection}>
                <Text style={verifyText}>Your Verification Code</Text>
                <Text style={codeText}>{verificationCode}</Text>
                <Text style={validityText}>
                  (This code is valid for 10 minutes)
                </Text>
              </Section>
            </Section>
            <Hr style={hr} />
            <Section style={lowerSection}>
              <Text style={cautionText}>
                Business Inventory will never email you and ask you to disclose
                or verify your password, credit card, or banking account number.
              </Text>
            </Section>
          </Section>
          <Text style={footerText}>
            This message was produced and distributed by Business Inventory,
            Inc. © {new Date().getFullYear()}, Business Inventory. All rights reserved.
            View our{' '}
            <Link href="https://businessinventory.com/privacy" target="_blank" style={link}>
              privacy policy
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

VerifyEmail.PreviewProps = {
  verificationCode: '596853',
} satisfies AWSVerifyEmailProps;

const main = {
  backgroundColor: '#fff',
  color: '#212121',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  padding: '20px',
  margin: '0 auto',
  maxWidth: '600px',
  backgroundColor: '#f9fafb',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '15px',
  textAlign: 'center' as const,
};

const link = {
  color: '#3b82f6',
  fontSize: '14px',
  textDecoration: 'underline',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const imageSection = {
  backgroundColor: '#ffffff',
  padding: '20px 0',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e5e7eb',
};

const coverSection = { 
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
};

const upperSection = { 
  padding: '30px',
  backgroundColor: '#ffffff',
};

const lowerSection = { 
  padding: '20px 30px',
  backgroundColor: '#fef3c7',
  borderRadius: '0 0 8px 8px',
};

const footerText = {
  ...text,
  fontSize: '12px',
  color: '#6b7280',
  padding: '20px 0 0',
  textAlign: 'center' as const,
};

const verifyText = {
  ...text,
  margin: '0',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  color: '#1f2937',
};

const codeText = {
  ...text,
  fontWeight: 'bold',
  fontSize: '36px',
  margin: '10px 0',
  textAlign: 'center' as const,
  color: '#3b82f6',
  letterSpacing: '8px',
};

const validityText = {
  ...text,
  margin: '0',
  textAlign: 'center' as const,
  fontSize: '14px',
  color: '#6b7280',
};

const verificationSection = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f3f4f6',
  padding: '30px',
  borderRadius: '8px',
  margin: '30px 0',
};

const mainText = { 
  ...text, 
  marginBottom: '20px',
  textAlign: 'center' as const,
};

const cautionText = { 
  ...text, 
  margin: '0',
  fontSize: '14px',
  color: '#92400e',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};