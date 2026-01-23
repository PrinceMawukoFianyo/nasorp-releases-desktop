import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link as EmailLink,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Heading } from '@react-email/components';

interface UserInvitationProps {
  roleName: string;
  orgName: string;
  linkUrl: string;
  orgLogo?: string; // Optional logo URL
}

export const UserInvitation = ({
  roleName,
  orgName,
  linkUrl,
  orgLogo = "/logo.svg", // Default to your logo
}: UserInvitationProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>You're invited to join {orgName} as {roleName}</Preview>
      <Container style={container}>
        <Section style={box}>
          {/* Using your logo */}
          <Img
            src={orgLogo.startsWith('http') ? orgLogo : `https://yourdomain.com${orgLogo}`}
            width="180"
            height="60"
            alt={orgName}
            style={logo}
          />
          <Heading style={h1}>You're Invited to Join Our Team</Heading>
          <Text style={heroText}>
            Hello,
          </Text>
          <Text style={heroText}>
            You've been invited to join <strong>{orgName}</strong> as a <strong>{roleName}</strong>.
          </Text>
          <Text style={paragraph}>
            Complete your account setup to get started and begin collaborating with the team.
          </Text>
          
          {/* THE INVITE BUTTON - This is where the link goes */}
          <Button style={button} href={linkUrl}>
            Set Up Your Account
          </Button>
          
          <Hr style={hr} />
          <Text style={paragraph}>
            This link will expire in 7 days. If you didn't expect this invitation, 
            please contact your administrator.
          </Text>
          <Text style={paragraph}>— {orgName} Team</Text>
          <Hr style={hr} />
          <Text style={footer}>
            {orgName} | All rights reserved
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default UserInvitation;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const box = {
  padding: '0 48px',
};

const logo = {
  margin: '0 auto 30px auto',
  display: 'block',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const button = {
  backgroundColor: '#7b1414',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '30px 0',
};

const footer = {
  color: '#816969',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#1d1c1d',
  fontSize: '28px',
  fontWeight: '600',
  margin: '0 0 20px 0',
  padding: '0',
  lineHeight: '36px',
  textAlign: 'center' as const,
};

const heroText = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '20px',
  color: '#333',
};