import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import TerminalIcon from '@mui/icons-material/Terminal';

import { HashLink as Link } from 'react-router-hash-link';

const pages = ['Skills', 'Projects', 'Contact'];

const scrollWithOffset = (el) => {
  const yCoordinate = el.getBoundingClientRect().top + window.scrollY;
  const yOffset = -100; 
  window.scrollTo({ top: yCoordinate + yOffset, behavior: 'smooth' }); 
}

export default function Navbar() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  return (
    <AppBar position='sticky'>
      <Container maxWidth='xl'>
        <Toolbar disableGutters>
          <TerminalIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant='h6'
            noWrap
            component='a'
            href='/'
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.2rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            M.DEV
          </Typography>

          <TerminalIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
          <Typography
            variant='h5'
            noWrap
            component='a'
            href=''
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            M.DEV
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end' }}>
            <IconButton
              size='large'
              aria-label='sections'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={handleOpenNavMenu}
              color='inherit'
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id='menu-appbar'
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={handleCloseNavMenu}>
                  <Link 
                    scroll={(el) => scrollWithOffset(el)}
                    to={'#' + page.toLowerCase()}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {page}
                  </Link>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
            {pages.map((page) => (
              <Link
                className='navLink'
                scroll={(el) => scrollWithOffset(el)}
                to={'#' + page.toLowerCase()}
                key={page}
                onMouseOver={(e) => e.target.style.background = 'rgba(143, 143, 143, 0.055)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
                onMouseUp={(e) => e.target.style.background = 'rgba(143, 143, 143, 0.055)'}
                onMouseDown={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.055)'}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '5rem', height: '2.5rem', borderRadius: '5px', color: 'inherit', textDecoration: 'none', marginRight: '1rem' }}
              >
                {page}
              </Link>
            ))}
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
}