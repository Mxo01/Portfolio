import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import StorageIcon from '@mui/icons-material/Storage';
import HtmlIcon from '@mui/icons-material/Html';
import CodeIcon from '@mui/icons-material/Code';
import { styled } from '@mui/material/styles';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

export default function Skills() {
  const frontEnd = ['Angular', 'React', 'HTML', 'CSS', 'JavaScript', 'TypeScript'];
  const backEnd = ['Java', 'Python', 'C', 'C++', 'SQL', 'Firebase'];
  const general = ['Web App', 'Web Scraping', 'Data Analysis', 'Data Mining', 'Git', 'Docker'];

  return (
    <Box sx={{ height: {xs: 'auto', sm: '90vh'}, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography
        variant='h2'
        id='skills'
        sx={{ fontSize: {xs: '2.5rem', sm: '3.5rem', xl: '5rem'}, fontWeight: 700, color: 'inherit', mb: 2, textAlign: 'center' }}
      >
        Skills
      </Typography>
      <Grid 
        container 
        rowSpacing={{ xs: 0 }} 
        columnSpacing={{ xs: 2, sm: 4, md: 6 }} 
        direction={{xs: 'column', sm: 'row'}}
        alignItems={{xs: 'stretch', md: 'stretch'}}
      >
        <Grid item xs sx={{ m: {xs: 4, sm: 0}, ml: {xs: 4, sm: 4}}}>
          <Item>
            <Typography
              sx={{ display: 'flex', justifyContent: 'center', fontWeight: 700, color: 'inherit', my: 2 }}
            >
              <HtmlIcon sx={{ mr: 1 }} />
              Front-End
            </Typography>
            <Divider />
            {frontEnd.map((skill) => (
              <Typography 
                key={skill}
                sx={{ my: 2 }}
              >
                {skill}
              </Typography>
            ))}
          </Item>
        </Grid>
        <Grid item xs sx={{ m: {xs: 4, sm: 0}}}>
          <Item>
            <Typography
              sx={{ display: 'flex', justifyContent: 'center', fontWeight: 700, color: 'inherit', my: 2 }}
            >
              <StorageIcon sx={{ mr: 1 }} />
              Back-End
            </Typography>
            <Divider />
            {backEnd.map(skill => (
              <Typography
                key={skill}
                sx={{ my: 2 }}
              >
                {skill}
              </Typography>
            ))}
          </Item>
        </Grid>
        <Grid item xs sx={{ m: {xs: 4, sm: 0}, mr: {xs: 4, sm: 4}}}>
          <Item>
            <Typography
              sx={{ display: 'flex', justifyContent: 'center', fontWeight: 700, color: 'inherit', my: 2 }}
            >
              <CodeIcon sx={{ mr: 1 }} />
              General
            </Typography>
            <Divider />
            {general.map((skill) => (
              <Typography
                key={skill}
                sx={{ my: 2 }}
              >
                {skill}
              </Typography>
            ))}
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
}