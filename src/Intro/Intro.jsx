import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import WorkIcon from '@mui/icons-material/Work';
import DownloadIcon from '@mui/icons-material/Download';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import EmailIcon from '@mui/icons-material/Email';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import LaunchIcon from '@mui/icons-material/Launch';

import React from 'react';

import cv from '../../src/assets/Mario Di Modica - CV.pdf';

export default function Intro() {
  const [openDialog, setOpenDialog] = React.useState(false);

  const handleMailto = (e) => {
    e.preventDefault();
    window.location.href = 'mailto:mariodimodica.01@gmail.com';
  }

  return (
    <Container id='home'>
      <Dialog open={openDialog}>
        <DialogTitle>Choose where to contact me</DialogTitle>
        <List sx={{ p: 2 }}>
          <ListItem disableGutters>
            <ListItemButton onClick={handleMailto}>
              <ListItemAvatar>
                <EmailIcon />
              </ListItemAvatar>
              <ListItemText primary="Gmail" />
              <ListItemAvatar>
                <LaunchIcon />
              </ListItemAvatar>
            </ListItemButton>
          </ListItem>
          <ListItem disableGutters>
            <ListItemButton href='https://www.linkedin.com/in/mariodimodica/'>
              <ListItemAvatar>
                <LinkedInIcon/>
              </ListItemAvatar>
              <ListItemText primary="LinkedIn" />
              <ListItemAvatar>
                <LaunchIcon />
              </ListItemAvatar>
            </ListItemButton>
          </ListItem>
          <ListItem disableGutters>
            <ListItemButton href='https://instagram.com/not_mxo?igshid=MzNlNGNkZWQ4Mg=='>
              <ListItemAvatar>
                <InstagramIcon/>
              </ListItemAvatar>
              <ListItemText primary="Instagram" />
              <ListItemAvatar>
                <LaunchIcon />
              </ListItemAvatar>
            </ListItemButton>
          </ListItem>
        </List>
        <Button
          variant='text'
          color='error'
          sx={{ mx: 2, mb: 2, width: '1rem', alignSelf: 'center'}}
          onClick={() => setOpenDialog(false)}
        >
          Close
        </Button>
      </Dialog>
      <Box sx={{ height: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography 
          variant='h2'
          sx={{ fontSize: {xs: '1.5rem', sm: '3rem', xl: '4rem'}, fontWeight: 700, textAlign: 'center', mt: 2 }}
        > 
          Hi! <WavingHandIcon sx={{ fontSize: {xs: '1.5rem', sm: '3rem', xl: '4rem'}, mx: 2 }} />
        </Typography>
        <Typography 
          variant='h2'
          sx={{ fontSize: {xs: '1.5rem', sm: '3rem', xl: '4rem'}, fontWeight: 700, textAlign: 'center', mb: 2 }}
        > 
          My name is Mario Di Modica and I am a Computer Science student
        </Typography>
        <Stack direction={{xs: 'column', sm: 'row'}} spacing={2}>
          <Tooltip title='Hire Me' placement='bottom'>
            <Button 
              size='large'
              variant='contained' 
              startIcon={<WorkIcon />}
              color='inherit'
              onClick={() => setOpenDialog(true)}
            >
              Hire Me
            </Button>
          </Tooltip>
          <Tooltip title='Download CV' placement='bottom'>
            <Button 
              variant='contained'
              endIcon={<DownloadIcon />}
              color='inherit'
              href={cv}
              download={true}
            >
              Curriculum
            </Button>
          </Tooltip>
        </Stack>
      </Box>
    </Container>
  );
}