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
                src={"https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqNug1Ds6iXAi0V4oKpMjE5ngydflZmc6e1FXhC"}
                width="500"
                height="150"
                alt="AFKBerimah's Logo"
              />
            </Section>
            <Section style={upperSection}>
              <Heading style={h1}>Business Inventory Email Verification </Heading>
              <Text style={mainText}>
                Thanks for starting the new Business account creation process. We
                want to make sure it's really you. Please enter the following
                verification code when prompted. If you don&apos;t want to
                create an account, you can ignore this message.
              </Text>
              <Section style={verificationSection}>
                <Text style={verifyText}>Verification code</Text>

                <Text style={codeText}>{verificationCode}</Text>
                <Text style={validityText}>
                  (This code is valid for 10 minutes)
                </Text>
              </Section>
            </Section>
            <Hr />
            <Section style={lowerSection}>
              <Text style={cautionText}>
                Business Inventory will never email you and ask you to disclose
                or verify your password, credit card, or banking account number.
              </Text>
            </Section>
          </Section>
          <Text style={footerText}>
            This message was produced and distributed by Business Inventory,
            Inc., 410 Terry Ave. North, Seattle, WA 98109. © 2022, Amazon Web
            Services, Inc.. All riUSts reserved. FMP is a registered trademark
            of{' '}
            <Link href="https://businessinventory.com" target="_blank" style={link}>
              BusinessInventory.com
            </Link>
            , Inc. View our{' '}
            <Link href="https://businessinventory.com" target="_blank" style={link}>
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
};

const container = {
  padding: '20px',
  margin: '0 auto',
  backgroundColor: '#eee',
};

const h1 = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '15px',
};

const link = {
  color: '#2754C5',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  textDecoration: 'underline',
};

const text = {
  color: '#333',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  margin: '24px 0',
};

const imageSection = {
  backgroundColor: '#252f3d',
  display: 'flex',
  padding: '20px 0',
  alignItems: 'center',
  justifyContent: 'center',
};

const coverSection = { backgroundColor: '#fff' };

const upperSection = { padding: '25px 35px' };

const lowerSection = { padding: '25px 35px' };

const footerText = {
  ...text,
  fontSize: '12px',
  padding: '0 20px',
};

const verifyText = {
  ...text,
  margin: 0,
  fontWeight: 'bold',
  textAlign: 'center' as const,
};

const codeText = {
  ...text,
  fontWeight: 'bold',
  fontSize: '36px',
  margin: '10px 0',
  textAlign: 'center' as const,
};

const validityText = {
  ...text,
  margin: '0px',
  textAlign: 'center' as const,
};

const verificationSection = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const mainText = { ...text, marginBottom: '14px' };

const cautionText = { ...text, margin: '0px' };
