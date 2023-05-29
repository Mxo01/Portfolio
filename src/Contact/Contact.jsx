import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import EmailIcon from '@mui/icons-material/Email';
import PhoneEnabledIcon from '@mui/icons-material/PhoneEnabled';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import Tooltip from '@mui/material/Tooltip';

export default function Contact() {
  const handleMailto = (e) => {
    e.preventDefault();
    window.location.href = 'mailto:mariodimodica.01@gmail.com';
  }

  return ( 
    <Box sx={{ height: '30vh', display: 'flex', flexDirection: {xs: 'column', sm: 'row'}}}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <Typography
          variant='h4'
          id='contact'
          sx={{ fontSize: {xs: '1rem', sm: '1rem', xl: '1.5rem'}, fontWeight: 700, color: 'inherit', ml: 2, mt: 2, mb: 2 }}
        >
          Contact Me 
          <br />
        </Typography>
        <Typography
          variant='h6'
          sx={{ fontSize: {xs: '0.6rem', sm: '0.8rem', xl: '1rem'}, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', ml: 2 }}
        >
          <EmailIcon sx={{ mr: 2 }}/>
          <Link 
            href="#" 
            underline="hover" 
            onClick={handleMailto}
          >
            {'mariodimodica.01@gmail.com'}
          </Link>
        </Typography>
        <Typography
          variant='h6'
          sx={{ fontSize: {xs: '0.6rem', sm: '0.8rem', xl: '1rem'}, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', ml: 2 }}
        >
          <Tooltip title='Download the CV to see' placement='bottom'>
            <PhoneEnabledIcon sx={{ mr: 2 }}/>
          </Tooltip>
          +39 331 *** ****
        </Typography>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%', height: '100%' }}>
        <Typography
          variant='h4'
          sx={{ display: 'flex', alignItems: 'center', fontSize: {xs: '1rem', sm: '1rem', xl: '1.5rem'}, fontWeight: 700, color: 'inherit', m: 2 }}
        >
          Find me here 
          <br />
        </Typography>
        <Typography
          variant='h6'
          sx={{ fontSize: {xs: '0.6rem', sm: '0.8rem', xl: '1rem'}, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', mr: 2, ml: {xs: 2} }}
        >
          <Link 
            href='https://github.com/Mxo01' 
            underline='hover'
          >
            {'@Mxo01'}
          </Link>
          <GitHubIcon sx={{ ml: 1 }}/>
        </Typography>
        <Typography
          variant='h6'
          sx={{ fontSize: {xs: '0.6rem', sm: '0.8rem', xl: '1rem'}, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', mr: 2, ml: {xs: 2} }}
        >
          <Link 
            href='https://www.linkedin.com/in/mariodimodica/' 
            underline='hover'
          >
            {'Mario Di Modica'}
          </Link>
          <LinkedInIcon sx={{ ml: 1 }}/>
        </Typography>
        <Typography
          variant='h6'
          sx={{ fontSize: {xs: '0.6rem', sm: '0.8rem', xl: '1rem'}, display: 'flex', alignItems: 'center', fontWeight: 700, color: 'inherit', mr: 2, mb: {xs: 2}, ml: {xs: 2}}}
        >
          <Link 
            href='https://instagram.com/not_mxo?igshid=MzNlNGNkZWQ4Mg==' 
              underline='hover'
            >
            {'@not_mxo'}
          </Link>
          <InstagramIcon sx={{ ml: 1 }}/>
        </Typography>
      </div>
    </Box>
  );
}