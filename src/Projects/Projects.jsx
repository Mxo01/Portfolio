import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';

import mylibretto from '../../src/assets/mylibretto.png';
import crafty from '../../src/assets/crafty.png';
import wordle from '../../src/assets/wordle.jpeg';

export default function Projects() {

  return (
    <Box sx={{ height: {sm: 'auto', md: '90vh'}, display: 'flex', flexDirection: 'column', alignItems: 'space-around', justifyContent: 'center' }}>
      <Typography
        variant='h2'
        id='projects'
        sx={{ fontSize: {xs: '2.5rem', sm: '3.5rem', xl: '5rem'}, fontWeight: 700, color: 'inherit', mb: 2, textAlign: 'center' }}
      >
        Projects
      </Typography>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          flexDirection: {xs : 'column', sm : 'column', md: 'row'}, 
          justifyContent: 'space-around'
        }}
      >
        <Card sx={{ mt: {xs: 2, sm: 4, md: 0}, width: {xs: 250, sm: 400, md: 280, xl: 345}, height: 500}}>
          <CardMedia
            sx={{ height: 300 }}
            image={mylibretto}
            title='MyLibretto'
          />
          <CardContent>
            <Typography 
              gutterBottom 
              variant='h5' 
              component='div'
              sx={{fontSize: {xs: '1rem', sm: '1rem', xl: '1.5rem'}, fontWeight: 700, color: 'inherit', mb: 1}}
            >
              MyLibretto
            </Typography>
            <Typography 
              variant='body2' 
              color='text.secondary'
              sx={{fontSize: {xs: '0.7rem', sm: '0.8rem', md: '0.8rem', xl: '0.8rem'}}}
            >
              MyLibretto is a Progressive Web App (PWA) written in <b>React</b> and <b>Firebase</b> that works offline and allows you to keep track of your university career, even without an internet connection.
            </Typography>
          </CardContent>
          <CardActions>
            <Tooltip title='See a Demo' placement='bottom'>
              <Button size='small' href='https://mylibretto.web.app/'>Demo</Button>
            </Tooltip>
            <Tooltip title='See the Source Code' placement='bottom'>
              <Button size='small' href='https://github.com/Mxo01/MyLibrettoPWA'>Source code</Button>
            </Tooltip>
          </CardActions>
        </Card>
        <Card sx={{ m: {xs: 4, sm: 4, md: 0}, width: {xs: 250, sm: 400, md: 280, xl: 345}, height: 500 }}>
          <CardMedia
            sx={{ height: 300 }}
            image={crafty}
            title='Crafty'
          />
          <CardContent>
            <Typography 
              gutterBottom 
              variant='h5' 
              component='div'
              sx={{fontSize: {xs: '1rem', sm: '1rem', xl: '1.5rem'}, fontWeight: 700, color: 'inherit', mb: 1}}
            >
              Crafty
            </Typography>
            <Typography 
              variant='body2' 
              color='text.secondary'
              sx={{fontSize: {xs: '0.7rem', sm: '0.8rem', md: '0.8rem', xl: '0.8rem'}}}
            >
              Crafty is a Web Scraping, Data Mining and Data Analysis University project written totally in <b>Python</b> and using some libraries like Pandas and NetworkX. It is based on a Bitcoin Dataset.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size='small' disabled>Demo</Button>
            <Tooltip title='See the Source Code' placement='bottom'>
              <Button size='small' href='https://github.com/Mxo01/CRAFTY'>Source code</Button>
            </Tooltip>
          </CardActions>
        </Card>
        <Card sx={{ mb: {xs: 4, sm: 4, md: 0}, width: {xs: 250, sm: 400, md: 280, xl: 345}, height: 500 }}>
          <CardMedia
            sx={{ height: 300 }}
            image={wordle}
            title='Wordle'
          />
          <CardContent>
            <Typography 
              gutterBottom 
              variant='h5' 
              component='div'
              sx={{fontSize: {xs: '1rem', sm: '1rem', xl: '1.5rem'}, fontWeight: 700, color: 'inherit', mb: 1}}
            >
              Wordle
            </Typography>
            <Typography 
              variant='body2' 
              color='text.secondary'
              sx={{fontSize: {xs: '0.7rem', sm: '0.8rem', md: '0.8rem', xl: '0.8rem'}}}
            >
              Wordle is the CLI version of the famouse Wordle game. It is written in <b>Java</b> and uses GSON library to parse JSON files and store all users data. You can share statistics with your friends.
            </Typography>
          </CardContent>
          <CardActions>
            <Button size='small' disabled>Demo</Button>
            <Tooltip title='See the Source Code' placement='bottom'>
              <Button size='small' href='https://github.com/Mxo01/Wordle'>Source code</Button>
            </Tooltip>
          </CardActions>
        </Card>
      </Box>
    </Box>
  );
}