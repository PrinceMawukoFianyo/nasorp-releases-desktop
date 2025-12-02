import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Heading } from 'lucide-react';

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : '';

export const UserInvitation = ({
  roleName,
  orgName,
  linkUrl,
}: {
  roleName: string;
  orgName: string;
  linkUrl: string;
}) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>You're invited to join {orgName} as {roleName}</Preview>
      <Container style={container}>
        <Section style={box}>
          <Img
                src={"https://3mkq65v2if.ufs.sh/f/nEsxSqMfLeqNug1Ds6iXAi0V4oKpMjE5ngydflZmc6e1FXhC"}
                width="500"
                height="150"
                alt={orgName}
              />
          <Heading style={h1}>You're Invited to Join Our Team</Heading>
          <Text style={heroText}>
           Hello
          </Text>
          <Text style={heroText}>
            You've been invited to join <strong>{orgName}</strong> as a <strong>{roleName}</strong>.
          </Text>
          <Text style={paragraph}>
            Complete your account setup to get started and begin collaborating with the team.
          </Text>
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
            {orgName} | All riUSts reserved
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
};

const box = {
  padding: '0 48px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const paragraph = {
  color: '#525f7f',

  fontSize: '16px',
  lineheight: '24px',
  textAlign: 'left' as const,
};

const anchor = {
  color: '#8d1515ff',
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
  padding: '10px',
};

const footer = {
  color: '#816969ff',
  fontSize: '12px',
  lineheight: '16px',
};
const h1 = {
  color: '#1d1c1d',
  fontSize: '30px',
  fontWeight: '600',
  margin: '30px 0',
  padding: '0',
  lineheight: '42px',
};

const heroText = {
  fontSize: '20px',
  lineheight: '28px',
  marginBottom: '30px',
};