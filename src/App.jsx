import Navbar from './Navbar/Navbar';
import Intro from './Intro/Intro';
import Skills from './Skills/Skills';
import Projects from './Projects/Projects';
import Contact from './Contact/Contact';
import BackToTop from './BackToTop/BackToTop';

import { BrowserRouter } from 'react-router-dom';

import Divider from '@mui/material/Divider';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  }
});

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <BackToTop />
        <Navbar />
        <Intro />
        <Divider />
        <Skills />
        <Divider />
        <Projects />
        <Divider />
        <Contact />
      </ThemeProvider>
    </BrowserRouter>
  );
}